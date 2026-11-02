import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Download,
  RefreshCw,
  Filter,
  Check,
  Radio,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import {
  liveMarketFeedService,
  LiveTrade,
} from "../services/liveMarketFeedService";

export interface RecentTradesProps {
  symbol: string;
  onPriceSelect?: (price: number) => void;
  compact?: boolean;
  maxTrades?: number;
  className?: string;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({
  symbol,
  onPriceSelect,
  compact = false,
  maxTrades = 50,
  className = "",
}) => {
  const [trades, setTrades] = useState<LiveTrade[]>(() =>
    liveMarketFeedService.getRecentTrades(symbol)
  );
  const [filterSide, setFilterSide] = useState<"ALL" | "BUY" | "SELL" | "WHALE">("ALL");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [flashTradeIds, setFlashTradeIds] = useState<Set<string>>(new Set());
  const [selectedTrade, setSelectedTrade] = useState<LiveTrade | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Web Audio Context reference for zero-dependency execution ticks
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play subtle synth tick on new trade execution if enabled
  const playTradeAudioTick = (side: "BUY" | "SELL", isWhale: boolean) => {
    if (!isAudioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") {
        ctx?.resume();
      }
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isWhale ? "triangle" : "sine";
        // Higher pitch for buys, lower for sells
        osc.frequency.setValueAtTime(
          side === "BUY" ? (isWhale ? 880 : 660) : isWhale ? 440 : 330,
          ctx.currentTime
        );
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (isWhale ? 0.15 : 0.05));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (isWhale ? 0.15 : 0.05));
      }
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  };

  // Subscribe to live trade feed from Binance / CoinGecko / TWE ATS
  useEffect(() => {
    // Clear flash IDs on symbol change
    setFlashTradeIds(new Set());
    setTrades(liveMarketFeedService.getRecentTrades(symbol));

    const unsubscribe = liveMarketFeedService.subscribeTrades(symbol, (updatedSymbol, incomingTrades) => {
      if (updatedSymbol !== symbol) return;

      if (!isPaused) {
        setTrades((prevTrades) => {
          // Detect newly arrived trades
          const prevTopId = prevTrades[0]?.id;
          const newTrades = incomingTrades.filter(
            (t) => !prevTrades.some((p) => p.id === t.id)
          );

          if (newTrades.length > 0) {
            const newest = newTrades[0];
            playTradeAudioTick(newest.side, !!newest.isWhale);

            // Add to flash IDs
            setFlashTradeIds((prev) => {
              const next = new Set(prev);
              newTrades.slice(0, 3).forEach((t) => next.add(t.id));
              return next;
            });

            // Clear flash after 800ms
            setTimeout(() => {
              setFlashTradeIds((prev) => {
                const next = new Set(prev);
                newTrades.forEach((t) => next.delete(t.id));
                return next;
              });
            }, 800);
          }

          return incomingTrades;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, isPaused, isAudioEnabled]);

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    let list = trades;
    if (filterSide === "BUY") {
      list = list.filter((t) => t.side === "BUY");
    } else if (filterSide === "SELL") {
      list = list.filter((t) => t.side === "SELL");
    } else if (filterSide === "WHALE") {
      list = list.filter((t) => t.isWhale || t.totalUsd >= 10000);
    }
    return list.slice(0, maxTrades);
  }, [trades, filterSide, maxTrades]);

  // Aggregate Order Flow Metrics
  const metrics = useMemo(() => {
    const sample = trades.slice(0, 50);
    let buyVol = 0;
    let sellVol = 0;
    let whaleCount = 0;
    let maxTradeUsd = 0;

    sample.forEach((t) => {
      if (t.side === "BUY") buyVol += t.totalUsd;
      else sellVol += t.totalUsd;
      if (t.isWhale || t.totalUsd >= 10000) whaleCount++;
      if (t.totalUsd > maxTradeUsd) maxTradeUsd = t.totalUsd;
    });

    const totalVol = buyVol + sellVol;
    const buyPercent = totalVol > 0 ? Math.round((buyVol / totalVol) * 100) : 50;
    const sellPercent = 100 - buyPercent;

    return {
      buyVol,
      sellVol,
      totalVol,
      buyPercent,
      sellPercent,
      whaleCount,
      maxTradeUsd,
      tradeCount: sample.length,
    };
  }, [trades]);

  // Force manual refresh from Binance REST API
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await liveMarketFeedService.fetchRecentTradesFromBinance(symbol);
    setTimeout(() => {
      setIsRefreshing(false);
      setTrades(liveMarketFeedService.getRecentTrades(symbol));
    }, 400);
  };

  // Export CSV for SEC Reg ATS audit trail
  const handleExportTrades = (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const data = trades.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        price: t.price,
        quantity: t.quantity,
        totalUsd: t.totalUsd,
        side: t.side,
        timestampIso: new Date(t.timestamp).toISOString(),
        source: t.source,
        isWhale: !!t.isWhale,
      }));

      let fileData: string;
      let mimeType: string;
      let filename = `trades_${symbol.replace("/", "_")}_${Date.now()}`;

      if (format === "csv") {
        const headers = ["ID", "SYMBOL", "PRICE", "QTY", "TOTAL_USD", "SIDE", "TIMESTAMP_ISO", "SOURCE", "IS_WHALE"];
        const rows = data.map((d) =>
          [d.id, d.symbol, d.price, d.quantity, d.totalUsd, d.side, d.timestampIso, d.source, d.isWhale].join(",")
        );
        fileData = [headers.join(","), ...rows].join("\n");
        mimeType = "text/csv";
        filename += ".csv";
      } else {
        fileData = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        filename += ".json";
      }

      const blob = new Blob([fileData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const primarySource = useMemo(() => {
    const top = trades[0];
    if (!top) return "BINANCE_WS";
    if (top.source === "BINANCE_WEBSOCKET") return "BINANCE_WS";
    if (top.source === "BINANCE_REST") return "BINANCE_REST";
    if (top.source === "COINGECKO_FEED") return "COINGECKO";
    return "TWE_ATS";
  }, [trades]);

  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col backdrop-blur-sm ${className}`}
    >
      {/* Component Header Bar */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Recent Trades</span>
              {/* Live Status Badge */}
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                  primarySource === "BINANCE_WS"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                    : primarySource === "BINANCE_REST"
                    ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40"
                    : primarySource === "COINGECKO"
                    ? "bg-amber-950/60 text-amber-300 border-amber-500/40"
                    : "bg-blue-950/60 text-blue-300 border-blue-500/40"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {primarySource === "BINANCE_WS"
                  ? "Binance WS Live"
                  : primarySource === "BINANCE_REST"
                  ? "Binance REST API"
                  : primarySource === "COINGECKO"
                  ? "CoinGecko Synced"
                  : "TokenWorld ATS"}
              </span>
            </div>
            {!compact && (
              <span className="text-[10px] text-slate-400 font-mono">
                {symbol} • Instant Ingestion & Price Fill
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1">
          {/* Pause / Resume */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume Live Feed" : "Pause Scrolling"}
            className={`p-1.5 rounded text-xs transition-colors border ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/60"
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>

          {/* Sound Tick Toggle */}
          <button
            type="button"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            title={isAudioEnabled ? "Mute Trade Sound" : "Enable Audio Tick"}
            className={`p-1.5 rounded text-xs transition-colors border ${
              isAudioEnabled
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/60"
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </button>

          {/* Force Refresh */}
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh Feed from Binance"
            className="p-1.5 rounded text-xs bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Export Dropdown / Quick Button */}
          <button
            type="button"
            onClick={() => handleExportTrades("csv")}
            title="Export CSV Audit Trail (SEC ATS)"
            className="p-1.5 rounded text-xs bg-slate-800/80 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            {!compact && <span className="text-[10px] font-mono">CSV</span>}
          </button>
        </div>
      </div>

      {/* Real-Time Buy vs Sell Momentum Ratio Meter */}
      <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/80">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            BUY {metrics.buyPercent}%
          </span>
          <span className="text-slate-400">
            50-Trade Volume:{" "}
            <span className="text-slate-200 font-bold">
              ${Math.round(metrics.totalVol).toLocaleString()}
            </span>
          </span>
          <span className="text-rose-400 font-semibold flex items-center gap-1">
            SELL {metrics.sellPercent}%
            <TrendingDown className="w-3 h-3" />
          </span>
        </div>
        {/* Momentum Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${metrics.buyPercent}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${metrics.sellPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs (All / Buys / Sells / Whales) */}
      <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setFilterSide("ALL")}
            className={`px-2 py-0.5 rounded transition-colors ${
              filterSide === "ALL"
                ? "bg-slate-800 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterSide("BUY")}
            className={`px-2 py-0.5 rounded transition-colors ${
              filterSide === "BUY"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold"
                : "text-emerald-400/80 hover:text-emerald-300"
            }`}
          >
            Buys
          </button>
          <button
            type="button"
            onClick={() => setFilterSide("SELL")}
            className={`px-2 py-0.5 rounded transition-colors ${
              filterSide === "SELL"
                ? "bg-rose-950 text-rose-300 border border-rose-500/40 font-bold"
                : "text-rose-400/80 hover:text-rose-300"
            }`}
          >
            Sells
          </button>
          <button
            type="button"
            onClick={() => setFilterSide("WHALE")}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
              filterSide === "WHALE"
                ? "bg-amber-950 text-amber-300 border border-amber-500/40 font-bold"
                : "text-amber-400/80 hover:text-amber-300"
            }`}
          >
            <span>🐋 Whales</span>
            {metrics.whaleCount > 0 && (
              <span className="px-1 rounded bg-amber-500/30 text-[9px]">
                {metrics.whaleCount}
              </span>
            )}
          </button>
        </div>

        {onPriceSelect && (
          <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">
            💡 Click price to autofill
          </span>
        )}
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-12 text-[10px] text-slate-400 font-mono px-3 py-1.5 border-b border-slate-800/80 bg-slate-950/40">
        <div className={compact ? "col-span-4" : "col-span-3"}>PRICE (USD)</div>
        <div className={compact ? "col-span-4 text-right" : "col-span-3 text-right"}>
          QTY ({symbol.split("/")[0]})
        </div>
        {!compact && <div className="col-span-3 text-right">TOTAL (USD)</div>}
        <div className={compact ? "col-span-4 text-right" : "col-span-3 text-right"}>TIME</div>
      </div>

      {/* Live Trade Tape Rows */}
      <div
        className={`divide-y divide-slate-800/30 overflow-y-auto font-mono text-xs ${
          compact ? "max-h-[340px]" : "max-h-[480px]"
        }`}
      >
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <div>No executed trades match current filter</div>
            <button
              onClick={() => setFilterSide("ALL")}
              className="text-cyan-400 underline hover:text-cyan-300 text-[11px]"
            >
              Reset filter to All
            </button>
          </div>
        ) : (
          filteredTrades.map((trade) => {
            const isBuy = trade.side === "BUY";
            const isFlashing = flashTradeIds.has(trade.id);
            const isWhale = trade.isWhale || trade.totalUsd >= 10000;

            return (
              <div
                key={trade.id}
                onClick={() => {
                  setSelectedTrade(trade);
                  if (onPriceSelect) onPriceSelect(trade.price);
                }}
                className={`grid grid-cols-12 items-center px-3 py-1.5 cursor-pointer transition-all duration-300 group hover:bg-slate-800/50 ${
                  isFlashing
                    ? isBuy
                      ? "bg-emerald-500/25 animate-pulse"
                      : "bg-rose-500/25 animate-pulse"
                    : isWhale
                    ? "bg-amber-500/5 hover:bg-amber-500/15"
                    : ""
                }`}
              >
                {/* Price Column */}
                <div
                  className={`flex items-center gap-1 font-semibold tabular-nums ${
                    compact ? "col-span-4" : "col-span-3"
                  } ${isBuy ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {isBuy ? (
                    <ArrowUpRight className="w-3 h-3 shrink-0 opacity-80 group-hover:scale-125 transition-transform" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 shrink-0 opacity-80 group-hover:scale-125 transition-transform" />
                  )}
                  <span>${trade.price.toFixed(trade.price < 10 ? 4 : 2)}</span>
                  {isWhale && (
                    <span
                      title={`Whale Execution: $${trade.totalUsd.toLocaleString()}`}
                      className="text-[10px] select-none"
                    >
                      🐋
                    </span>
                  )}
                </div>

                {/* Quantity Column */}
                <div
                  className={`tabular-nums text-slate-300 text-right ${
                    compact ? "col-span-4" : "col-span-3"
                  }`}
                >
                  {trade.quantity.toLocaleString(undefined, {
                    minimumFractionDigits: trade.quantity < 1 ? 4 : 2,
                    maximumFractionDigits: trade.quantity < 1 ? 4 : 2,
                  })}
                </div>

                {/* Total USD Column (Desktop / Expanded) */}
                {!compact && (
                  <div className="col-span-3 text-right tabular-nums text-slate-400">
                    ${trade.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                )}

                {/* Execution Timestamp */}
                <div
                  className={`text-right tabular-nums text-[10px] text-slate-500 group-hover:text-slate-300 flex items-center justify-end gap-1 ${
                    compact ? "col-span-4" : "col-span-3"
                  }`}
                >
                  <span>
                    {new Date(trade.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Trade Detailed Modal / Drawer */}
      {selectedTrade && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-200">Execution Receipt</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  selectedTrade.side === "BUY"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-950 text-rose-300 border border-rose-500/30"
                }`}
              >
                {selectedTrade.side}
              </span>
            </div>
            <button
              onClick={() => setSelectedTrade(null)}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Trade ID:</span>
              <span className="text-slate-300 select-all truncate block">{selectedTrade.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Execution Price:</span>
              <span className="text-cyan-300 font-bold">${selectedTrade.price.toFixed(2)} USD</span>
            </div>
            <div>
              <span className="text-slate-500 block">Quantity Filled:</span>
              <span className="text-slate-200 font-medium">
                {selectedTrade.quantity} {symbol.split("/")[0]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Settlement:</span>
              <span className="text-emerald-400 font-bold">
                ${selectedTrade.totalUsd.toLocaleString()} USD
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Feed Origin:</span>
              <span className="text-slate-300">{selectedTrade.source}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Timestamp:</span>
              <span className="text-slate-400">{new Date(selectedTrade.timestamp).toISOString()}</span>
            </div>
          </div>

          {onPriceSelect && (
            <button
              onClick={() => {
                onPriceSelect(selectedTrade.price);
                setSelectedTrade(null);
              }}
              className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-sans text-xs font-semibold transition-colors flex items-center justify-center gap-1 mt-1"
            >
              <Check className="w-3.5 h-3.5" /> Set As Order Price (${selectedTrade.price.toFixed(2)})
            </button>
          )}
        </div>
      )}

      {/* Footer Info & Regulatory Compliance */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          <span>Audit: SEC Reg ATS Rule 301</span>
        </span>
        <span>
          {isPaused ? (
            <span className="text-amber-400 font-bold">PAUSED (Buffer Active)</span>
          ) : (
            <span className="text-slate-400">Stream: Real-time</span>
          )}
        </span>
      </div>
    </div>
  );
};
