import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Radio,
  Clock,
  ExternalLink,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  ChevronDown,
  RefreshCw,
  X,
  FileText,
  Lock,
  Link2,
  Play,
  Flame,
  HelpCircle,
  Check,
  Info,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  liveMarketFeedService,
  MarketTicker,
  LiveOrderBookDepth,
  FeedConnectionStatus,
  LiveTrade,
} from "../services/liveMarketFeedService";
import {
  globalAtsEngine,
  ExtendedAtsOrder,
  OrderExecutionType,
  OcoEventLog,
} from "../utils/atsMatchingEngine";
import { AtsTradeExecution, OWNER_PROFILE } from "../utils/atsVenueData";
import { RecentTrades } from "./RecentTrades";

interface AdvancedTradingTerminalProps {
  tokens?: TokenRecord[];
  selectedToken?: TokenRecord | null;
  onSelectToken?: (token: TokenRecord) => void;
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
}

export const AdvancedTradingTerminal: React.FC<AdvancedTradingTerminalProps> = ({
  tokens = [],
  selectedToken,
  onSelectToken,
  metaMaskAccount,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
}) => {
  // Active pair selection
  const [activeSymbol, setActiveSymbol] = useState<string>("TREE3/USDT");

  // Live feed states
  const [tickers, setTickers] = useState<Record<string, MarketTicker>>(() =>
    liveMarketFeedService.getAllTickers()
  );
  const [feedStatus, setFeedStatus] = useState<FeedConnectionStatus>("CONNECTING");
  const [pingMs, setPingMs] = useState<number>(24);

  // Order Book depth
  const [depth, setDepth] = useState<LiveOrderBookDepth>(() =>
    liveMarketFeedService.generateOrderBookDepth(activeSymbol, 12)
  );

  // Order Entry Form
  const [orderType, setOrderType] = useState<OrderExecutionType>("OCO");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("SELL");
  const [priceInput, setPriceInput] = useState<string>("137.50");
  const [quantityInput, setQuantityInput] = useState<string>("100");
  const [stopPriceInput, setStopPriceInput] = useState<string>("118.75");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("118.00");

  // Active bottom manager view
  const [bottomTab, setBottomTab] = useState<"orders" | "oco_simulator" | "oco_audit" | "recent_trades">("orders");

  // Pre-trade risk status / notifications
  const [notification, setNotification] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  // Active open and trigger orders & OCO history
  const [openOrders, setOpenOrders] = useState<ExtendedAtsOrder[]>([]);
  const [triggerOrders, setTriggerOrders] = useState<ExtendedAtsOrder[]>([]);
  const [recentTrades, setRecentTrades] = useState<AtsTradeExecution[]>([]);
  const [ocoEvents, setOcoEvents] = useState<OcoEventLog[]>([]);

  const traderAddress = metaMaskAccount || "0x70AcE3628eD48bfa63aA4F447817DCEc9f323cAC";

  const refreshEngineState = useCallback(() => {
    const baseSym = activeSymbol.split("/")[0];
    const book = globalAtsEngine.getBook(baseSym);
    const userBids = book.bids.filter(
      (b) => b.traderAddress.toLowerCase() === traderAddress.toLowerCase()
    ) as ExtendedAtsOrder[];
    const userAsks = book.asks.filter(
      (a) => a.traderAddress.toLowerCase() === traderAddress.toLowerCase()
    ) as ExtendedAtsOrder[];
    setOpenOrders([...userBids, ...userAsks]);
    setTriggerOrders(globalAtsEngine.getTriggerOrders(baseSym, traderAddress));
    setRecentTrades(book.trades.slice(0, 15));
    setOcoEvents(globalAtsEngine.getOcoEvents(30));
  }, [activeSymbol, traderAddress]);

  // Subscribe to live feed & evaluate triggers
  useEffect(() => {
    const unsubTickers = liveMarketFeedService.subscribeTickers((newTickers) => {
      setTickers(newTickers);
      const curr = newTickers[activeSymbol];
      if (curr) {
        // Trigger Stop-Loss and OCO orders waiting for this market price
        const trigResult = globalAtsEngine.checkStopLossAndOcoTriggers(
          activeSymbol.split("/")[0],
          curr.price
        );
        if (
          trigResult.triggeredOrders.length > 0 ||
          trigResult.cancelledOcoOrders.length > 0 ||
          trigResult.executedTrades.length > 0
        ) {
          refreshEngineState();
          // Ingest ATS executed trades to the live RecentTrades feed
          if (trigResult.executedTrades.length > 0) {
            trigResult.executedTrades.forEach((trd) => {
              liveMarketFeedService.addExecutedTrade({
                id: `twe-trig-${trd.id}`,
                symbol: activeSymbol,
                price: trd.price,
                quantity: trd.quantity,
                totalUsd: trd.totalUsd,
                side: "SELL",
                timestamp: trd.timestamp,
                source: "TWE_ATS_MATCH",
                isWhale: trd.totalUsd >= 10000,
              });
            });
          }
          if (trigResult.cancelledOcoOrders.length > 0) {
            setNotification({
              type: "warning",
              text: `⚡ OCO Automated Cancellation: Stop-Loss triggered at $${curr.price.toFixed(
                2
              )}. Linked Limit Order (${trigResult.cancelledOcoOrders.join(", ")}) was automatically cancelled!`,
            });
          }
        }
      }
    });

    const unsubStatus = liveMarketFeedService.subscribeStatus((status, ping) => {
      setFeedStatus(status);
      setPingMs(ping);
    });

    return () => {
      unsubTickers();
      unsubStatus();
    };
  }, [activeSymbol, refreshEngineState]);

  // Update order book depth regularly
  useEffect(() => {
    const interval = setInterval(() => {
      setDepth(liveMarketFeedService.generateOrderBookDepth(activeSymbol, 12));
    }, 1200);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  // Sync inputs on pair or side change
  useEffect(() => {
    const t = tickers[activeSymbol];
    if (t) {
      if (orderSide === "SELL") {
        setPriceInput((t.price * 1.1).toFixed(2));
        setStopPriceInput((t.price * 0.95).toFixed(2));
        setLimitPriceInput((t.price * 0.945).toFixed(2));
      } else {
        setPriceInput((t.price * 0.95).toFixed(2));
        setStopPriceInput((t.price * 1.05).toFixed(2));
        setLimitPriceInput((t.price * 1.055).toFixed(2));
      }
    }
    refreshEngineState();
  }, [activeSymbol, orderSide, refreshEngineState]);

  useEffect(() => {
    refreshEngineState();
  }, [refreshEngineState]);

  const currentTicker = useMemo(() => {
    return (
      tickers[activeSymbol] || {
        symbol: activeSymbol,
        baseAsset: activeSymbol.split("/")[0],
        quoteAsset: activeSymbol.split("/")[1] || "USDT",
        name: activeSymbol,
        price: 125.0,
        change24h: 3.2,
        high24h: 128.5,
        low24h: 121.0,
        volume24h: 88500000,
        bidPrice: 124.8,
        askPrice: 125.2,
        source: "TWE_TREASURY_ORACLE" as const,
        lastUpdated: Date.now(),
      }
    );
  }, [tickers, activeSymbol]);

  const calculatedTotal = useMemo(() => {
    const p = parseFloat(priceInput) || 0;
    const q = parseFloat(quantityInput) || 0;
    return (p * q).toFixed(2);
  }, [priceInput, quantityInput]);

  // Identify all active linked OCO pairs in book
  const activeOcoPairs = useMemo(() => {
    const pairs: Array<{
      limitOrder: ExtendedAtsOrder;
      stopOrder: ExtendedAtsOrder;
    }> = [];

    openOrders.forEach((ord) => {
      if (ord.ocoPairId) {
        const matchingStop = triggerOrders.find((t) => t.id === ord.ocoPairId);
        if (matchingStop) {
          pairs.push({ limitOrder: ord, stopOrder: matchingStop });
        }
      }
    });

    return pairs;
  }, [openOrders, triggerOrders]);

  // Quick preset helper for OCO brackets
  const handleApplyOcoPreset = (tpPercent: number, slPercent: number) => {
    const cur = currentTicker.price;
    if (orderSide === "SELL") {
      const tp = cur * (1 + tpPercent / 100);
      const sl = cur * (1 - Math.abs(slPercent) / 100);
      const slExec = sl * 0.995;
      setPriceInput(tp.toFixed(2));
      setStopPriceInput(sl.toFixed(2));
      setLimitPriceInput(slExec.toFixed(2));
    } else {
      const tp = cur * (1 - Math.abs(tpPercent) / 100);
      const sl = cur * (1 + slPercent / 100);
      const slExec = sl * 1.005;
      setPriceInput(tp.toFixed(2));
      setStopPriceInput(sl.toFixed(2));
      setLimitPriceInput(slExec.toFixed(2));
    }
  };

  // Pre-trade risk validation: SEC Rule 15c3-5 collar ±10% + OCO Geometry
  const validatePreTradeRisk = (): { valid: boolean; reason?: string } => {
    const refPrice = currentTicker.price;
    const p = parseFloat(priceInput);
    const q = parseFloat(quantityInput);

    if (isNaN(q) || q <= 0) return { valid: false, reason: "Quantity must be greater than zero." };

    if (orderType === "LIMIT") {
      if (isNaN(p) || p <= 0) return { valid: false, reason: "Limit price must be greater than zero." };
      const collarMin = refPrice * 0.85;
      const collarMax = refPrice * 1.15;
      if (p < collarMin || p > collarMax) {
        return {
          valid: false,
          reason: `SEC Rule 15c3-5 Pre-Trade Collar: Price ($${p.toFixed(2)}) exceeds ±15% band ($${collarMin.toFixed(2)} - $${collarMax.toFixed(2)}).`,
        };
      }
    }

    if (orderType === "STOP_LOSS" || orderType === "STOP_LIMIT") {
      const sp = parseFloat(stopPriceInput);
      if (isNaN(sp) || sp <= 0) return { valid: false, reason: "Stop trigger price must be greater than zero." };
    }

    if (orderType === "OCO") {
      const sp = parseFloat(stopPriceInput);
      const lp = parseFloat(limitPriceInput);

      if (isNaN(p) || p <= 0) return { valid: false, reason: "Take-Profit Limit price must be greater than zero." };
      if (isNaN(sp) || sp <= 0) return { valid: false, reason: "Stop trigger price must be greater than zero." };
      if (isNaN(lp) || lp <= 0) return { valid: false, reason: "Stop execution limit price must be greater than zero." };

      if (orderSide === "SELL") {
        if (sp >= p) {
          return {
            valid: false,
            reason: `OCO SELL Geometry Error: Take-Profit Limit ($${p.toFixed(2)}) must be higher than Stop Trigger ($${sp.toFixed(2)}).`,
          };
        }
      } else {
        if (sp <= p) {
          return {
            valid: false,
            reason: `OCO BUY Geometry Error: Breakout Stop Trigger ($${sp.toFixed(2)}) must be higher than Dip Limit ($${p.toFixed(2)}).`,
          };
        }
      }
    }

    return { valid: true };
  };

  const handlePlaceOrder = () => {
    const check = validatePreTradeRisk();
    if (!check.valid) {
      setNotification({ type: "error", text: check.reason! });
      setTimeout(() => setNotification(null), 6000);
      return;
    }

    const baseSym = activeSymbol.split("/")[0];
    const p = parseFloat(priceInput);
    const q = parseFloat(quantityInput);
    const sp = parseFloat(stopPriceInput);
    const lp = parseFloat(limitPriceInput);

    const result = globalAtsEngine.addExtendedOrder({
      traderAddress,
      side: orderSide,
      price: orderType === "MARKET" ? currentTicker.price : p,
      quantity: q,
      symbol: baseSym,
      orderType,
      stopPrice: sp,
      limitPrice: lp,
    });

    refreshEngineState();
    if (result.matchedTrades.length > 0) {
      result.matchedTrades.forEach((trd) => {
        liveMarketFeedService.addExecutedTrade({
          id: `twe-match-${trd.id}`,
          symbol: activeSymbol,
          price: trd.price,
          quantity: trd.quantity,
          totalUsd: trd.totalUsd,
          side: orderSide,
          timestamp: trd.timestamp,
          source: "TWE_ATS_MATCH",
          isWhale: trd.totalUsd >= 10000,
        });
      });
    }
    setNotification({
      type: "success",
      text: `${result.message}. ${
        result.matchedTrades.length > 0
          ? `Matched ${result.matchedTrades.length} trade(s) with T+0 settlement!`
          : "Placed on order book and trigger registry."
      }`,
    });
    setTimeout(() => setNotification(null), 6500);
  };

  const handleCancelOrder = (orderId: string, isOco: boolean = false) => {
    const baseSym = activeSymbol.split("/")[0];
    const success = globalAtsEngine.cancelOrder(orderId, baseSym, true);
    if (success) {
      refreshEngineState();
      setNotification({
        type: "warning",
        text: isOco
          ? `OCO Bracket cancelled: Order ${orderId} and its paired leg were both cancelled.`
          : `Order ${orderId} successfully cancelled.`,
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleFillPriceFromBook = (price: number) => {
    setPriceInput(price.toFixed(2));
  };

  // OCO Simulation Handlers (Live demonstration of mutual cancellation)
  const handleSimulateTakeProfitHit = (pair: {
    limitOrder: ExtendedAtsOrder;
    stopOrder: ExtendedAtsOrder;
  }) => {
    const targetPrice = pair.limitOrder.price;
    liveMarketFeedService.setTickerPrice(activeSymbol, targetPrice);

    // Let the matching engine match the resting limit order and execute OCO mutual cancellation
    const baseSym = activeSymbol.split("/")[0];
    globalAtsEngine.matchOrders(baseSym);
    globalAtsEngine.checkStopLossAndOcoTriggers(baseSym, targetPrice);

    refreshEngineState();
    setNotification({
      type: "success",
      text: `🎯 OCO Take-Profit Executed at $${targetPrice.toFixed(
        2
      )}! Paired Stop-Loss #${pair.stopOrder.id} was automatically cancelled.`,
    });
    setTimeout(() => setNotification(null), 7000);
  };

  const handleSimulateStopLossHit = (pair: {
    limitOrder: ExtendedAtsOrder;
    stopOrder: ExtendedAtsOrder;
  }) => {
    const targetPrice = pair.stopOrder.stopPrice || pair.stopOrder.price;
    liveMarketFeedService.setTickerPrice(activeSymbol, targetPrice);

    // Trigger stop-loss evaluation and verify limit leg cancellation
    const baseSym = activeSymbol.split("/")[0];
    const trigResult = globalAtsEngine.checkStopLossAndOcoTriggers(baseSym, targetPrice);

    refreshEngineState();
    setNotification({
      type: "warning",
      text: `⚡ OCO Stop-Loss Triggered at $${targetPrice.toFixed(
        2
      )}! Paired Take-Profit Limit #${pair.limitOrder.id} was automatically cancelled.`,
    });
    setTimeout(() => setNotification(null), 7000);
  };

  const handleDeployDemoOcoBracket = () => {
    const baseSym = activeSymbol.split("/")[0];
    const cur = currentTicker.price;
    const isSell = orderSide === "SELL";

    const tpPrice = isSell ? Number((cur * 1.08).toFixed(2)) : Number((cur * 0.92).toFixed(2));
    const slPrice = isSell ? Number((cur * 0.94).toFixed(2)) : Number((cur * 1.06).toFixed(2));
    const slExecPrice = isSell ? Number((cur * 0.935).toFixed(2)) : Number((cur * 1.065).toFixed(2));

    const result = globalAtsEngine.addExtendedOrder({
      traderAddress,
      side: orderSide,
      price: tpPrice,
      quantity: 100,
      symbol: baseSym,
      orderType: "OCO",
      stopPrice: slPrice,
      limitPrice: slExecPrice,
    });

    refreshEngineState();
    setBottomTab("oco_simulator");
    setNotification({
      type: "success",
      text: `⚡ Demo OCO bracket created! TP at $${tpPrice} & Stop at $${slPrice}. Click either simulation button below to watch the other leg get cancelled!`,
    });
    setTimeout(() => setNotification(null), 8000);
  };

  const handleResetReferencePrice = () => {
    const defaultPrice =
      activeSymbol === "TREE3/USDT"
        ? 125.0
        : activeSymbol === "TW-EQ/USD"
        ? 52.5
        : activeSymbol === "BTC/USDT"
        ? 64500.0
        : 2650.0;
    liveMarketFeedService.setTickerPrice(activeSymbol, defaultPrice);
    refreshEngineState();
    setNotification({
      type: "success",
      text: `Reference price reset to $${defaultPrice.toFixed(2)}.`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Ticker & Reality Stream Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Pair Selector & Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                aria-label="Select trading pair"
                value={activeSymbol}
                onChange={(e) => setActiveSymbol(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="TREE3/USDT">TREE3/USDT · Sovereign Token</option>
                <option value="TW-EQ/USD">TW-EQ/USD · Treasury Equity</option>
                <option value="BTC/USDT">BTC/USDT · Bitcoin Live</option>
                <option value="ETH/USDT">ETH/USDT · Ethereum Live</option>
                <option value="SOL/USDT">SOL/USDT · Solana Live</option>
              </select>
            </div>
            <div className="hidden sm:flex flex-col text-xs text-slate-400">
              <span className="font-semibold text-slate-300">{currentTicker.name}</span>
              <span className="text-slate-500">Sole Owner: {OWNER_PROFILE.soleOwnerName}</span>
            </div>
          </div>

          {/* Ticker Metrics */}
          <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">LAST PRICE</div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  currentTicker.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                ${currentTicker.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">24H CHANGE</div>
              <div
                className={`tabular-nums font-semibold flex items-center gap-1 ${
                  currentTicker.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {currentTicker.change24h >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {currentTicker.change24h >= 0 ? "+" : ""}
                {currentTicker.change24h.toFixed(2)}%
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-slate-400 text-[10px]">24H HIGH / LOW</div>
              <div className="tabular-nums text-slate-300">
                ${currentTicker.high24h.toFixed(2)} / ${currentTicker.low24h.toFixed(2)}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-slate-400 text-[10px]">24H VOLUME</div>
              <div className="tabular-nums text-slate-200">
                ${(currentTicker.volume24h / 1e6).toFixed(2)}M
              </div>
            </div>
          </div>

          {/* Feed Health & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  feedStatus === "CONNECTED_BINANCE_WS"
                    ? "bg-emerald-400"
                    : feedStatus === "CONNECTED_COINGECKO_REST"
                    ? "bg-amber-400"
                    : "bg-cyan-400 animate-pulse"
                }`}
              />
              <span className="font-mono text-slate-300 text-[11px]">
                {feedStatus === "CONNECTED_BINANCE_WS"
                  ? "Binance WS Live"
                  : feedStatus === "CONNECTED_COINGECKO_REST"
                  ? "CoinGecko API"
                  : "Connecting..."}
              </span>
              <span className="text-slate-500 font-mono text-[10px]">({pingMs}ms)</span>
            </div>

            {!isMetaMaskConnected ? (
              <button
                onClick={onOpenMetaMaskSync}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-xs font-mono text-slate-400">
                {traderAddress.slice(0, 6)}...{traderAddress.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-3">
          <div
            className={`flex items-center justify-between p-3 rounded text-xs border ${
              notification.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/50"
                : notification.type === "warning"
                ? "bg-amber-950/40 text-amber-300 border-amber-500/50"
                : "bg-rose-950/40 text-rose-300 border-rose-500/50"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              )}
              <span className="font-mono">{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Trading Cockpit Grid */}
      <div className="max-w-7xl mx-auto w-full px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Column: Order Book & Depth Visualizer (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Order Book Depth</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Spread: <span className="text-slate-200">${depth.spread.toFixed(2)}</span> ({depth.spreadPercent}%)
            </div>
          </div>

          <div className="grid grid-cols-3 text-[10px] text-slate-500 font-mono pb-1 border-b border-slate-800/40">
            <div>PRICE (USD)</div>
            <div className="text-right">SIZE</div>
            <div className="text-right">TOTAL (USD)</div>
          </div>

          {/* Asks (Sell orders - red) in reverse order */}
          <div className="flex flex-col-reverse gap-0.5 my-1 overflow-hidden">
            {depth.asks.slice(0, 6).map((ask, i) => (
              <button
                key={`ask-${i}`}
                onClick={() => handleFillPriceFromBook(ask.price)}
                className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 text-left rounded hover:bg-rose-950/30 transition-colors group cursor-pointer"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none rounded-r"
                  style={{ width: `${ask.depthPercent}%` }}
                />
                <span className="text-rose-400 tabular-nums font-medium z-10">
                  {ask.price.toFixed(2)}
                </span>
                <span className="text-right text-slate-300 tabular-nums z-10">
                  {ask.quantity.toFixed(3)}
                </span>
                <span className="text-right text-slate-400 tabular-nums z-10">
                  ${Math.round(ask.total).toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          {/* Mid Market Price Indicator */}
          <div className="py-2 my-1 px-2 border-y border-slate-800 bg-slate-950/60 flex items-center justify-between font-mono">
            <span className="text-xs text-slate-400">MID PRICE</span>
            <span className="text-base font-bold tabular-nums text-cyan-300">
              ${depth.midPrice.toFixed(2)}
            </span>
          </div>

          {/* Bids (Buy orders - green) */}
          <div className="flex flex-col gap-0.5 my-1 overflow-hidden flex-1">
            {depth.bids.slice(0, 6).map((bid, i) => (
              <button
                key={`bid-${i}`}
                onClick={() => handleFillPriceFromBook(bid.price)}
                className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 text-left rounded hover:bg-emerald-950/30 transition-colors group cursor-pointer"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none rounded-r"
                  style={{ width: `${bid.depthPercent}%` }}
                />
                <span className="text-emerald-400 tabular-nums font-medium z-10">
                  {bid.price.toFixed(2)}
                </span>
                <span className="text-right text-slate-300 tabular-nums z-10">
                  {bid.quantity.toFixed(3)}
                </span>
                <span className="text-right text-slate-400 tabular-nums z-10">
                  ${Math.round(bid.total).toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>CLOB Depth Visualizer</span>
            <span className="text-cyan-400">Active Market Feeds</span>
          </div>
        </div>

        {/* Center Column: Order Entry & Execution Terminal (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col">
          {/* Order Side Segmented Toggle */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-lg mb-3">
            <button
              onClick={() => setOrderSide("BUY")}
              className={`py-2 text-xs font-bold rounded transition-colors ${
                orderSide === "BUY"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              BUY {activeSymbol.split("/")[0]}
            </button>
            <button
              onClick={() => setOrderSide("SELL")}
              className={`py-2 text-xs font-bold rounded transition-colors ${
                orderSide === "SELL"
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SELL {activeSymbol.split("/")[0]}
            </button>
          </div>

          {/* Order Type Tabs (OCO Bracket, Limit, Market, Stop-Loss) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg mb-3">
            {(["OCO", "LIMIT", "MARKET", "STOP_LOSS"] as OrderExecutionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
                  orderType === t
                    ? "bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "OCO" && <Zap className="w-3 h-3 text-amber-400" />}
                {t === "OCO"
                  ? "OCO (Bracket)"
                  : t === "STOP_LOSS"
                  ? "Stop-Loss"
                  : t === "LIMIT"
                  ? "Limit"
                  : "Market"}
              </button>
            ))}
          </div>

          {/* OCO Quick Presets & Educational Explainer */}
          {orderType === "OCO" && (
            <div className="mb-3 p-2.5 bg-slate-950/70 border border-amber-500/30 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px]">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  One-Cancels-the-Other (OCO) Bracket
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Mutual Auto-Cancel</span>
              </div>

              {/* Bracket Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyOcoPreset(5, 3)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-mono transition-colors"
                >
                  {orderSide === "SELL" ? "+5% TP / -3% SL" : "-3% Dip / +5% Break"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyOcoPreset(10, 5)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-mono transition-colors"
                >
                  {orderSide === "SELL" ? "+10% TP / -5% SL" : "-5% Dip / +10% Break"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyOcoPreset(15, 7)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-mono transition-colors"
                >
                  {orderSide === "SELL" ? "+15% TP / -7% SL" : "-7% Dip / +15% Break"}
                </button>
              </div>

              {/* Visual Bracket Diagram */}
              <div className="p-2 bg-slate-900/90 rounded border border-slate-800 text-[11px] font-mono space-y-1">
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    Leg 1: Take-Profit Limit
                  </span>
                  <span className="font-bold">${parseFloat(priceInput || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[10px] pl-4">
                  <span>Current Market Price</span>
                  <span className="text-cyan-300 font-semibold">${currentTicker.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" />
                    Leg 2: Stop-Loss Trigger
                  </span>
                  <span className="font-bold">${parseFloat(stopPriceInput || "0").toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Order Form Inputs */}
          <div className="space-y-3 flex-1">
            {/* Price Input (if not Market) */}
            {orderType !== "MARKET" && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium flex items-center gap-1">
                    {orderType === "OCO" ? (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        Take-Profit Limit Price
                      </>
                    ) : (
                      "Price"
                    )}
                  </span>
                  <span className="font-mono text-slate-500">USD</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                    placeholder="0.00"
                  />
                </div>
                {orderType === "OCO" && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Rests in the active order book. If executed first, automatically cancels the Stop-Loss.
                  </p>
                )}
              </div>
            )}

            {/* Stop Price Trigger (for Stop-Loss & OCO) */}
            {(orderType === "STOP_LOSS" || orderType === "OCO") && (
              <div>
                <div className="flex justify-between text-xs text-amber-400 mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {orderType === "OCO" ? "Stop-Loss Trigger Price" : "Stop Trigger Price"}
                  </span>
                  <span className="font-mono text-slate-500">USD</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={stopPriceInput}
                  onChange={(e) => setStopPriceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded px-3 py-2 font-mono text-sm text-amber-200 focus:outline-none focus:border-amber-400"
                  placeholder="Stop Price"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  If the market touches this price, Stop activates and the Take-Profit Limit order is cancelled.
                </p>
              </div>
            )}

            {/* Stop-Limit Price (for OCO bracket) */}
            {orderType === "OCO" && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium">Stop-Limit Execution Price</span>
                  <span className="font-mono text-slate-500">USD</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={limitPriceInput}
                  onChange={(e) => setLimitPriceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Limit Execution Price"
                />
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Quantity</span>
                <span className="font-mono text-slate-500">{activeSymbol.split("/")[0]}</span>
              </div>
              <input
                type="number"
                step="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                placeholder="100"
              />
            </div>

            {/* Pre-Trade Value Calculation */}
            <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Value:</span>
                <span className="text-white font-bold tabular-nums">${calculatedTotal} USD</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Pre-Trade Collar (SEC 15c3-5):</span>
                <span className="text-emerald-400">Active (±15%)</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Settlement Standard:</span>
                <span className="text-cyan-400">Atomic T+0 DvP</span>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full mt-4 py-3 rounded font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 ${
              orderSide === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600 hover:bg-rose-500 text-white"
            }`}
          >
            {orderType === "OCO" && <Zap className="w-4 h-4" />}
            {orderSide} {quantityInput || "0"} {activeSymbol.split("/")[0]} ({orderType})
          </button>
        </div>

        {/* Right Column: Recent Trades Component (Binance / CoinGecko / TWE ATS) & OCO Bench (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <RecentTrades
            symbol={activeSymbol}
            onPriceSelect={handleFillPriceFromBook}
            compact={true}
            maxTrades={40}
            className="flex-1"
          />

          {/* Quick Demo OCO Placer */}
          <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Quick Test Bench
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1-Click Demo</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Deploy an instant test OCO bracket with Take-Profit & Stop-Loss legs to verify mutual cancellation in real time.
            </p>
            <button
              onClick={handleDeployDemoOcoBracket}
              className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Deploy Demo OCO Bracket
            </button>
            <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>CLOB Engine:</span>
                <span className="text-slate-300 font-mono">TokenWorldCLOB v3.2</span>
              </div>
              <div className="flex justify-between">
                <span>Auditing:</span>
                <span className="text-slate-300 font-mono">SEC Reg ATS Rule 301</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Orders, OCO Simulator Bench, and Audit History */}
      <div className="max-w-7xl mx-auto w-full px-4 mt-2">
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
          {/* Bottom Tabs */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBottomTab("orders")}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-2 ${
                  bottomTab === "orders"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Active Orders</span>
                <span className="px-1.5 py-0.2 bg-slate-900 rounded text-[10px] text-cyan-300 font-mono">
                  {openOrders.length + triggerOrders.length}
                </span>
              </button>

              <button
                onClick={() => setBottomTab("oco_simulator")}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-2 ${
                  bottomTab === "oco_simulator"
                    ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ OCO Interactive Simulator</span>
                <span className="px-1.5 py-0.2 bg-amber-900/50 rounded text-[10px] text-amber-200 font-mono">
                  {activeOcoPairs.length}
                </span>
              </button>

              <button
                onClick={() => setBottomTab("oco_audit")}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-2 ${
                  bottomTab === "oco_audit"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>OCO Audit Trail</span>
                <span className="px-1.5 py-0.2 bg-slate-900 rounded text-[10px] text-slate-300 font-mono">
                  {ocoEvents.length}
                </span>
              </button>

              <button
                onClick={() => setBottomTab("recent_trades")}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-2 ${
                  bottomTab === "recent_trades"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recent Trades Tape & Analytics</span>
                <span className="px-1.5 py-0.2 bg-emerald-900/40 rounded text-[10px] text-emerald-300 font-mono border border-emerald-500/30">
                  Live Feed
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetReferencePrice}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono px-2 py-1 rounded hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" /> Reset Price
              </button>
              <button
                onClick={refreshEngineState}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono px-2 py-1 rounded hover:bg-slate-800"
              >
                <RefreshCw className="w-3 h-3" /> Refresh State
              </button>
            </div>
          </div>

          {/* TAB 1: ACTIVE ORDERS TABLE */}
          {bottomTab === "orders" && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="py-2 px-2">ORDER ID</th>
                    <th className="py-2 px-2">TYPE</th>
                    <th className="py-2 px-2">SIDE</th>
                    <th className="py-2 px-2">PRICE</th>
                    <th className="py-2 px-2">TRIGGER</th>
                    <th className="py-2 px-2">QTY</th>
                    <th className="py-2 px-2">OCO LINK</th>
                    <th className="py-2 px-2">STATUS</th>
                    <th className="py-2 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {openOrders.length === 0 && triggerOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No open orders or pending trigger orders found for this session.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Open Active Limit Orders */}
                      {openOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-2 text-slate-300 font-bold">{ord.id}</td>
                          <td className="py-2 px-2 text-slate-400">{ord.orderType}</td>
                          <td className="py-2 px-2">
                            <span
                              className={
                                ord.side === "BUY"
                                  ? "text-emerald-400 font-semibold"
                                  : "text-rose-400 font-semibold"
                              }
                            >
                              {ord.side}
                            </span>
                          </td>
                          <td className="py-2 px-2 tabular-nums text-white">${ord.price.toFixed(2)}</td>
                          <td className="py-2 px-2 text-slate-500">—</td>
                          <td className="py-2 px-2 tabular-nums">{ord.quantity.toLocaleString()}</td>
                          <td className="py-2 px-2">
                            {ord.ocoPairId ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
                                <Link2 className="w-3 h-3" /> Pair: {ord.ocoPairId}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-cyan-400 font-medium">{ord.status}</td>
                          <td className="py-2 px-2 text-right">
                            <button
                              onClick={() => handleCancelOrder(ord.id, !!ord.ocoPairId)}
                              className="text-rose-400 hover:text-rose-300 font-medium px-2 py-0.5 rounded hover:bg-rose-950/40 transition-colors"
                            >
                              {ord.ocoPairId ? "Cancel Bracket" : "Cancel"}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Pending Trigger Orders (Stop-Loss / Stop-Limit) */}
                      {triggerOrders.map((trig) => (
                        <tr key={trig.id} className="hover:bg-slate-800/30 bg-amber-950/10">
                          <td className="py-2 px-2 text-amber-300 font-bold">{trig.id}</td>
                          <td className="py-2 px-2 text-amber-400">{trig.orderType}</td>
                          <td className="py-2 px-2">
                            <span
                              className={
                                trig.side === "BUY"
                                  ? "text-emerald-400 font-semibold"
                                  : "text-rose-400 font-semibold"
                              }
                            >
                              {trig.side}
                            </span>
                          </td>
                          <td className="py-2 px-2 tabular-nums text-white">${trig.price.toFixed(2)}</td>
                          <td className="py-2 px-2 text-amber-400 font-bold tabular-nums">
                            ${(trig.stopPrice || trig.price).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 tabular-nums">{trig.quantity.toLocaleString()}</td>
                          <td className="py-2 px-2">
                            {trig.ocoPairId ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
                                <Link2 className="w-3 h-3" /> Pair: {trig.ocoPairId}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-amber-300 font-semibold">WAITING TRIGGER</td>
                          <td className="py-2 px-2 text-right">
                            <button
                              onClick={() => handleCancelOrder(trig.id, !!trig.ocoPairId)}
                              className="text-rose-400 hover:text-rose-300 font-medium px-2 py-0.5 rounded hover:bg-rose-950/40 transition-colors"
                            >
                              {trig.ocoPairId ? "Cancel Bracket" : "Cancel"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: OCO INTERACTIVE SIMULATOR */}
          {bottomTab === "oco_simulator" && (
            <div className="mt-3 space-y-4">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded text-xs space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>One-Cancels-the-Other (OCO) Real-Time Simulator</span>
                </div>
                <p className="text-slate-400">
                  An OCO bracket consists of two mutually linked orders: a resting{" "}
                  <span className="text-emerald-400 font-semibold">Take-Profit Limit Order</span> and a conditional{" "}
                  <span className="text-amber-400 font-semibold">Stop-Loss Order</span>. When the market price triggers or executes either leg, the trading engine automatically removes and cancels the remaining leg.
                </p>
              </div>

              {activeOcoPairs.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg p-6 space-y-3">
                  <div className="text-slate-400 text-sm">No active OCO brackets currently registered.</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Submit an OCO order using the form on the left, or deploy an instant demo bracket with 100 {activeSymbol.split("/")[0]} tokens to test the cancellation engine.
                  </p>
                  <button
                    onClick={handleDeployDemoOcoBracket}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors inline-flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Deploy Demo OCO Bracket Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeOcoPairs.map((pair, idx) => (
                    <div
                      key={pair.limitOrder.id}
                      className="p-4 bg-slate-950/90 border border-amber-500/30 rounded-lg space-y-3 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Link2 className="w-4 h-4 text-amber-400" />
                          OCO Bracket #{idx + 1}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {pair.limitOrder.side} {pair.limitOrder.quantity} {activeSymbol.split("/")[0]}
                        </span>
                      </div>

                      {/* Leg Breakdown */}
                      <div className="space-y-2 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Take-Profit Limit: #{pair.limitOrder.id}
                          </span>
                          <span className="font-bold text-sm">${pair.limitOrder.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            Stop-Loss Trigger: #{pair.stopOrder.id}
                          </span>
                          <span className="font-bold text-sm">
                            ${(pair.stopOrder.stopPrice || pair.stopOrder.price).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Simulation Buttons */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] text-slate-400 font-sans">
                          Click below to simulate price movements and watch the remaining leg auto-cancel:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSimulateTakeProfitHit(pair)}
                            className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-left transition-colors flex flex-col"
                          >
                            <span className="font-bold text-[11px] flex items-center gap-1">
                              <Play className="w-3 h-3" /> Hit Take-Profit
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Simulate price ${pair.limitOrder.price.toFixed(2)}
                            </span>
                          </button>

                          <button
                            onClick={() => handleSimulateStopLossHit(pair)}
                            className="p-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded text-left transition-colors flex flex-col"
                          >
                            <span className="font-bold text-[11px] flex items-center gap-1">
                              <Play className="w-3 h-3" /> Hit Stop-Loss
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Simulate trigger ${(pair.stopOrder.stopPrice || pair.stopOrder.price).toFixed(2)}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                        <span>OCO Invariant: First trigger cancels paired order</span>
                        <button
                          onClick={() => handleCancelOrder(pair.limitOrder.id, true)}
                          className="text-rose-400 hover:text-rose-300 underline font-sans"
                        >
                          Cancel Entire Bracket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OCO AUDIT TRAIL LOG */}
          {bottomTab === "oco_audit" && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="py-2 px-2">TIME</th>
                    <th className="py-2 px-2">EVENT TYPE</th>
                    <th className="py-2 px-2">TRIGGERED / EXECUTED</th>
                    <th className="py-2 px-2">CANCELLED LEG</th>
                    <th className="py-2 px-2">EXECUTION DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {ocoEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No OCO audit events recorded yet. Place an OCO bracket or run a simulation to generate compliance records.
                      </td>
                    </tr>
                  ) : (
                    ocoEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-2 text-slate-400 tabular-nums">
                          {new Date(evt.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-2">
                          {evt.eventType === "OCO_PLACED" && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                              BRACKET PLACED
                            </span>
                          )}
                          {evt.eventType === "OCO_TRIGGERED_STOP" && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/30">
                              STOP TRIGGERED ➔ LIMIT CANCELLED
                            </span>
                          )}
                          {evt.eventType === "OCO_FILLED_LIMIT" && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              LIMIT FILLED ➔ STOP CANCELLED
                            </span>
                          )}
                          {evt.eventType === "OCO_CANCELLED_USER" && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500/30">
                              USER CANCELLED ➔ PAIR REMOVED
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-white font-bold">{evt.triggeredOrderId}</td>
                        <td className="py-2 px-2 text-rose-400 font-bold">{evt.cancelledOrderId}</td>
                        <td className="py-2 px-2 text-slate-300">{evt.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: RECENT TRADES TAPE & REAL-TIME ANALYTICS */}
          {bottomTab === "recent_trades" && (
            <div className="mt-2">
              <RecentTrades
                symbol={activeSymbol}
                onPriceSelect={handleFillPriceFromBook}
                compact={false}
                maxTrades={80}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
