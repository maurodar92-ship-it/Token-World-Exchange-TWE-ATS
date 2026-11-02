import React, { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Columns, 
  Radio, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  TrendingUp, 
  Landmark, 
  Percent, 
  Fingerprint, 
  Sparkles, 
  CheckCircle2, 
  Crown,
  Scale,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useShowroomSync, DeviceViewportMode, ShowroomModuleId } from '../../context/ShowroomSyncContext';
import { MobileTerminalView } from './MobileTerminalView';
import { HsmSecurityHub } from './HsmSecurityHub';
import { TokenWorldAtsTerminal } from '../TokenWorldAtsTerminal';
import { SecMonitorComponent } from '../SecMonitorComponent';
import { DiscountCenter } from '../membership/DiscountCenter';
import { useMembership } from '../../context/MembershipContext';

export const EnterpriseShowroomView: React.FC<{ onNavigateToTab?: (tab: string) => void }> = ({ onNavigateToTab }) => {
  const { 
    deviceMode, 
    setDeviceMode, 
    activeModule, 
    setActiveModule, 
    latencyMs, 
    isStreamActive, 
    simulateMobileTradePush,
    syncedOrders,
    lastSyncedTimestamp 
  } = useShowroomSync();

  const { currentPlan, openCheckoutModal } = useMembership();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSimulateSyncAction = () => {
    simulateMobileTradePush();
    setToastMessage(`Simulated mobile order transmitted via gRPC! Synced across all viewports in ${latencyMs}ms.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans space-y-6">
      {/* Top Showroom Header & Device Switcher Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 border-b border-slate-800/80 px-4 sm:px-6 py-4 sticky top-16 z-30 backdrop-blur-md shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Showroom Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/50">
              <Sparkles className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  ENTERPRISE SHOWROOM SUITE
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                  Tier: <strong className="text-emerald-400 uppercase">{currentPlan.badgeLabel}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
                Token World Exchange ATS® Cross-Platform Showroom
              </h1>
            </div>
          </div>

          {/* Device Viewport Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                deviceMode === 'desktop'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Desktop Multi-Monitor Workstation View"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Desktop Workstation</span>
            </button>

            <button
              onClick={() => setDeviceMode('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                deviceMode === 'tablet'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Tablet Executive Dual-Pane View"
            >
              <Tablet className="w-4 h-4" />
              <span className="hidden sm:inline">Tablet Pro</span>
            </button>

            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Mobile Native Simulated Device Frame"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Mobile Native</span>
            </button>

            <button
              onClick={() => setDeviceMode('side_by_side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                deviceMode === 'side_by_side'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Live Side-by-Side Synchronized Telemetry View"
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:inline">Side-by-Side Sync</span>
            </button>
          </div>

          {/* Quick Simulation CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateSyncAction}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl shadow-lg transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Simulate Mobile Order Sync</span>
            </button>
          </div>
        </div>

        {/* Telemetry Status Strip */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>STREAM: gRPC / WSS TELEMETRY LIVE</span>
            </div>
            <div>
              CROSS-DEVICE LATENCY: <strong className="text-white">{latencyMs}ms</strong>
            </div>
            <div className="hidden sm:block">
              LAST MIRROR PING: <span className="text-slate-300">{lastSyncedTimestamp}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>SYNCED ORDERS: <strong className="text-emerald-400">{syncedOrders.length}</strong></span>
            <span className="text-slate-600">&bull;</span>
            <span>SETTLEMENT: <strong className="text-amber-400">T+0 ATOMIC</strong></span>
          </div>
        </div>

        {toastMessage && (
          <div className="max-w-7xl mx-auto mt-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Main Showroom Canvas */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6 flex-1">
        
        {/* Module Sub-Suite Tabs (Only in Desktop and Tablet modes) */}
        {deviceMode !== 'mobile' && (
          <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'trading', label: '1. Multi-Asset L2 Terminal', icon: TrendingUp },
              { id: 'sec_monitor', label: '2. SEC EDGAR Monitor', icon: Landmark },
              { id: 'discount_center', label: '3. Discount Center & Fee Rebates', icon: Percent },
              { id: 'hsm_security', label: '4. Institutional HSM Security & ISO 20022', icon: ShieldCheck },
              { id: 'architecture_pillars', label: '5. Enterprise Design Pillars Matrix', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeModule === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveModule(tab.id as ShowroomModuleId)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            VIEWPORT MODE 1: DESKTOP WORKSTATION
           ========================================================================= */}
        {deviceMode === 'desktop' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {activeModule === 'trading' && <TokenWorldAtsTerminal onNavigateToTab={onNavigateToTab} />}
            {activeModule === 'sec_monitor' && <SecMonitorComponent onNavigateToTab={onNavigateToTab} />}
            {activeModule === 'discount_center' && <DiscountCenter isModal={false} />}
            {activeModule === 'hsm_security' && <HsmSecurityHub />}
            {activeModule === 'architecture_pillars' && <EnterpriseArchitecturePillars />}
          </div>
        )}

        {/* =========================================================================
            VIEWPORT MODE 2: TABLET PRO DUAL PANE
           ========================================================================= */}
        {deviceMode === 'tablet' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">iPad Pro 13&Prime; Executive Canvas</span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    Dual Pane Adaptive Layout
                  </span>
                </div>
                <span>Resolution: 2732 &times; 2048 &bull; Retina OLED</span>
              </div>

              {/* Render chosen module inside tablet frame */}
              <div>
                {activeModule === 'trading' && <TokenWorldAtsTerminal onNavigateToTab={onNavigateToTab} />}
                {activeModule === 'sec_monitor' && <SecMonitorComponent onNavigateToTab={onNavigateToTab} />}
                {activeModule === 'discount_center' && <DiscountCenter isModal={false} />}
                {activeModule === 'hsm_security' && <HsmSecurityHub />}
                {activeModule === 'architecture_pillars' && <EnterpriseArchitecturePillars />}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEWPORT MODE 3: MOBILE NATIVE
           ========================================================================= */}
        {deviceMode === 'mobile' && (
          <div className="py-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <span>Simulated Mobile Native Application (iOS / Android)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete mobile terminal with biometric Touch ID order entry, instant gas estimation, and real-time blotter mirroring.
              </p>
            </div>

            <MobileTerminalView />
          </div>
        )}

        {/* =========================================================================
            VIEWPORT MODE 4: SIDE-BY-SIDE SYNCHRONIZED COMPARISON
           ========================================================================= */}
        {deviceMode === 'side_by_side' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/60 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white flex items-center gap-2">
                  <Columns className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Cross-Platform Mirroring (Desktop &amp; Mobile Sim)</span>
                </span>
                <span className="text-slate-400 mt-0.5 block">
                  Orders executed on the mobile device instantly reflect in the desktop blotter with sub-12ms gRPC state synchronization.
                </span>
              </div>

              <button
                onClick={handleSimulateSyncAction}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Instant Sync Trade</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Desktop Terminal View (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-emerald-400" />
                    <span>DESKTOP WORKSTATION BLOTTER &amp; L2 BOOK</span>
                  </span>
                  <span className="text-emerald-400">Stream Status: CONNECTED</span>
                </div>
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                  <TokenWorldAtsTerminal onNavigateToTab={onNavigateToTab} />
                </div>
              </div>

              {/* Right Column: Mobile View (4 cols) */}
              <div className="lg:col-span-4 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 pb-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>MOBILE NATIVE SIMULATOR</span>
                  </span>
                  <span className="text-amber-400">Touch ID: READY</span>
                </div>
                <MobileTerminalView />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Architecture Comparison Matrix Sub-component
function EnterpriseArchitecturePillars() {
  return (
    <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-amber-400" />
          <span>Four Technical Pillars &amp; Enterprise Comparison Matrix</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Detailed comparison between the Web Workstation / Desktop Terminal and the Mobile Native Application.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px] bg-slate-900/60">
              <th className="py-3 px-4">Architectural Area</th>
              <th className="py-3 px-4">Web Workstation / Desktop (Electron/Tauri)</th>
              <th className="py-3 px-4">Mobile Native Application (iOS / Android)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            <tr>
              <td className="py-3.5 px-4 font-bold text-white">Trading Terminal &amp; L2 Depth</td>
              <td className="py-3.5 px-4 text-slate-300">
                Full multi-window grid: Depth chart, Level 2 order book, execution blotter, time &amp; sales stream, TradingView charts.
              </td>
              <td className="py-3.5 px-4 text-slate-300">
                Modular tabbed terminal: Toggleable order book visualizer, simplified order ticket, depth quick-view.
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-4 font-bold text-white">Asset &amp; Custody Ledger</td>
              <td className="py-3.5 px-4 text-slate-300">
                Consolidated portfolio balance breakdown, staking yields, multi-chain custody ledger with CSV export.
              </td>
              <td className="py-3.5 px-4 text-slate-300">
                High-level net worth card, instant token search, fast transfer/swap drawers with gas estimators.
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-4 font-bold text-white">Security &amp; Hardware Keys</td>
              <td className="py-3.5 px-4 text-slate-300">
                Hardware key management (YubiKey 5Ci), IP whitelisting, API key permission scope manager, FIPS 140-2 Level 4.
              </td>
              <td className="py-3.5 px-4 text-slate-300">
                Passkey/Biometric login (Touch ID / Face ID), prompt-based push approval for web-initiated transactions.
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-4 font-bold text-white">Regulatory Reporting</td>
              <td className="py-3.5 px-4 text-slate-300">
                Real-time transaction tagging, exportable CSV/Tax ledger histories, standardized ISO 20022 XML structures.
              </td>
              <td className="py-3.5 px-4 text-slate-300">
                Instant push alerts on 8-K filings, execution receipt cards, and mobile compliance snapshot view.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
