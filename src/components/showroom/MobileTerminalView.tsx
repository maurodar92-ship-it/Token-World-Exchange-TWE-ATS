import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Fingerprint, 
  Zap, 
  Bell, 
  Layers, 
  CheckCircle2, 
  Wifi, 
  Battery, 
  Signal, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  Coins,
  ChevronRight
} from 'lucide-react';
import { useShowroomSync } from '../../context/ShowroomSyncContext';
import { useMembership } from '../../context/MembershipContext';

export const MobileTerminalView: React.FC = () => {
  const { 
    syncedOrders, 
    submitCrossDeviceOrder, 
    latencyMs,
    simulateMobileTradePush 
  } = useShowroomSync();

  const { currentPlan } = useMembership();

  const [mobileTab, setMobileTab] = useState<'trade' | 'blotter' | 'security'>('trade');
  const [selectedTicker, setSelectedTicker] = useState<'TWE' | 'BTC' | 'ETH'>('TWE');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState<number>(1000);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  const priceMap = { TWE: 1.85, BTC: 64280.0, ETH: 3490.0 };
  const currentPrice = priceMap[selectedTicker];
  const orderTotal = Number((qty * currentPrice).toFixed(2));

  const handleMobileSubmit = () => {
    setIsExecuting(true);
    setTimeout(() => {
      submitCrossDeviceOrder({
        deviceOrigin: 'Mobile Native iOS/Android',
        symbol: selectedTicker,
        side,
        orderType: 'LIMIT',
        qty,
        price: currentPrice,
        totalUsd: orderTotal
      });
      setIsExecuting(false);
      setOrderToast(
        `${side} ${qty.toLocaleString()} ${selectedTicker} confirmed via Touch ID! Synced to Desktop blotter in ${latencyMs}ms.`
      );
      setTimeout(() => setOrderToast(null), 4000);
    }, 600);
  };

  return (
    <div className="flex justify-center p-2">
      {/* Phone Hardware Bezel Container */}
      <div className="relative w-full max-w-[390px] h-[780px] bg-slate-950 rounded-[48px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col font-sans text-slate-100 ring-1 ring-slate-700/60 select-none">
        
        {/* Dynamic Island & Status Bar */}
        <div className="pt-3 px-6 pb-2 bg-slate-950 flex items-center justify-between text-[11px] font-mono text-slate-400 z-20">
          <span className="font-bold text-white">9:41</span>
          
          {/* Dynamic Island pill */}
          <div className="w-24 h-5 bg-black rounded-full border border-slate-800/80 flex items-center justify-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-400 font-mono tracking-tight">TWE ATS</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Real-time sync sub-header */}
        <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>DESKTOP SYNC: {latencyMs}ms</span>
          </div>
          <span className="text-slate-400 font-bold">{currentPlan.badgeLabel}</span>
        </div>

        {/* Mobile Viewport Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Portfolio Net Worth Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800/80 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Institutional Portfolio</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">$1,482,950.00</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +14.8%
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Settlement: T+0 Atomic</span>
              <span className="text-emerald-400">Rebate: {currentPlan.feeRebatePct}%</span>
            </div>
          </div>

          {/* Quick Push notification simulation */}
          {orderToast && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="leading-tight text-[11px]">{orderToast}</span>
            </div>
          )}

          {mobileTab === 'trade' && (
            <div className="space-y-3">
              {/* Asset Selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['TWE', 'BTC', 'ETH'] as const).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setSelectedTicker(sym)}
                    className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                      selectedTicker === sym
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>{sym}</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                      ${priceMap[sym].toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>

              {/* Side Selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSide('BUY')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    side === 'BUY'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400'
                  }`}
                >
                  BUY / LONG
                </button>
                <button
                  onClick={() => setSide('SELL')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    side === 'SELL'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400'
                  }`}
                >
                  SELL / SHORT
                </button>
              </div>

              {/* Quantity Preset Chips */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Order Quantity:</span>
                  <span className="font-mono font-bold text-white">{qty.toLocaleString()} {selectedTicker}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
                  {[250, 500, 1000, 5000].map(val => (
                    <button
                      key={val}
                      onClick={() => setQty(val)}
                      className={`py-1 rounded-lg border text-center transition-all ${
                        qty === val 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Ticket Total & Rebate info */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Price Quote:</span>
                  <span className="font-mono text-white">${currentPrice.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ATS Tier Rebate:</span>
                  <span className="font-mono text-emerald-400">-{currentPlan.feeRebatePct}% (Lowest venue fee)</span>
                </div>
                <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-xs text-white">
                  <span>Total Notional:</span>
                  <span className="font-mono text-emerald-400">${orderTotal.toLocaleString()} USD</span>
                </div>
              </div>

              {/* Biometric Confirmation Button */}
              <button
                disabled={isExecuting}
                onClick={handleMobileSubmit}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                  side === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/60'
                } disabled:opacity-50`}
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Secure Enclave...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Confirm Order (Touch ID / Face ID)</span>
                  </>
                )}
              </button>

              <button
                onClick={simulateMobileTradePush}
                className="w-full py-2 rounded-xl text-[10px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Simulate Automated Random Fill & Sync</span>
              </button>
            </div>
          )}

          {mobileTab === 'blotter' && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Synchronized Executions ({syncedOrders.length})
              </span>
              <div className="space-y-2">
                {syncedOrders.slice(0, 6).map((ord) => (
                  <div key={ord.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ord.side} {ord.qty} {ord.symbol}
                      </span>
                      <span className="text-white">${ord.totalUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                      <span>{ord.deviceOrigin}</span>
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mobileTab === 'security' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hardware Key &amp; Secure Enclave</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Keys are bound to Apple Secure Enclave / Android KeyStore. No raw private keys ever touch memory.
                </p>
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                  FIPS 140-2 Level 4 Verified &bull; ISO 20022 Enabled
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="bg-slate-950 border-t border-slate-800/80 py-2.5 px-6 flex items-center justify-around z-20">
          <button
            onClick={() => setMobileTab('trade')}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              mobileTab === 'trade' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Trade</span>
          </button>

          <button
            onClick={() => setMobileTab('blotter')}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              mobileTab === 'blotter' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Blotter</span>
          </button>

          <button
            onClick={() => setMobileTab('security')}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              mobileTab === 'security' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security</span>
          </button>
        </div>

        {/* Home indicator bar */}
        <div className="pb-1.5 pt-0.5 bg-slate-950 flex justify-center">
          <div className="w-32 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
