import React, { useState } from "react";
import {
  Terminal,
  Cpu,
  Database,
  Copy,
  Check,
  Download,
  Zap,
  Layers,
  ArrowRight,
  Info,
  ShieldCheck,
  Code2,
} from "lucide-react";
import {
  GETH_JAVASCRIPT_TRACER_CODE,
  GETH_GO_NATIVE_TRACER_CODE,
  simulateGethTransientTracer,
  GethTracerSimulationResult,
} from "../utils/doubleEntryLedgerAndGethTracerEngine";

export const GethTransientTracerView: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<"js_tracer" | "go_tracer" | "rpc_curl">("js_tracer");
  const [selectedTxArchetype, setSelectedTxArchetype] = useState<"uniswap_v4_lock" | "vault_transient_guard">("uniswap_v4_lock");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const simulation: GethTracerSimulationResult = simulateGethTransientTracer(selectedTxArchetype);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadJsTracer = () => {
    const blob = new Blob([GETH_JAVASCRIPT_TRACER_CODE], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eip1153_transient_tracer.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  const curlRpcExample = `curl -X POST http://localhost:8545 \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "debug_traceTransaction",
    "params": [
      "${simulation.txHash}",
      {
        "tracer": ${JSON.stringify(GETH_JAVASCRIPT_TRACER_CODE)}
      }
    ]
  }'`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Terminal className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  EIP-1153 Transient Storage Geth Tracer Studio
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Cancun Hardfork (0x5c / 0x5d)
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Custom JavaScript and Go execution hooks for <code className="text-cyan-300 font-mono">debug_traceTransaction</code> to capture ephemeral memory mutations that leave zero footprint in post-state tries.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJsTracer}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] text-xs font-mono transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Download .js Tracer
            </button>
          </div>
        </div>

        {/* 3 Core Architecture Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#23232A]">
          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl space-y-1">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              1. Opcode Interception
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Filters for <code className="text-cyan-300">TSTORE</code> (0x5d) and <code className="text-cyan-300">TLOAD</code> (0x5c) on every EVM step. Standard state diffs ignore transient storage because all slots reset to 0 at transaction boundaries.
            </p>
          </div>

          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl space-y-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              2. Stack Inspection (peek)
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <code className="text-amber-300">log.stack.peek(0)</code> retrieves the target 32-byte slot hash; <code className="text-amber-300">log.stack.peek(1)</code> captures the written payload during TSTORE operations.
            </p>
          </div>

          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl space-y-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              3. Gas Efficiency Delta
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Transient reads and writes cost only <strong>100 gas</strong> each, saving 99.5% compared to warm/cold <code className="text-emerald-300">SSTORE</code> (2,900 to 20,000 gas) for flash-loan or reentrancy locks.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Dashboard */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23232A]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Interactive Tracer Runner & Step Trace Inspector
            </h3>
            <p className="text-xs text-gray-400">
              Select an EVM transaction pattern to run the custom JavaScript tracer and inspect captured <code className="text-cyan-300 font-mono">transientLogs</code>.
            </p>
          </div>

          {/* Archetype Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Transaction:</span>
            <select
              value={selectedTxArchetype}
              onChange={(e) => setSelectedTxArchetype(e.target.value as any)}
              className="bg-[#101014] border border-[#2B2B33] rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="uniswap_v4_lock">Uniswap v4 Flash Accounting Mutex</option>
              <option value="vault_transient_guard">EIP-1153 Transient Reentrancy Vault</option>
            </select>
          </div>
        </div>

        {/* Tx Metadata Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500 block uppercase">Block Number</span>
            <span className="text-xs font-mono font-bold text-white">#{simulation.blockNumber}</span>
          </div>
          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500 block uppercase">Gas Consumed</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{simulation.gasUsed.toLocaleString()} units</span>
          </div>
          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500 block uppercase">Transient Operations</span>
            <span className="text-xs font-mono font-bold text-amber-300">{simulation.transientLogs.length} intercepted</span>
          </div>
          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500 block uppercase">Standard State Diff Footprint</span>
            <span className="text-xs font-mono font-bold text-rose-400">0 (Reset to zero)</span>
          </div>
        </div>

        {/* Captured Transient Logs Table */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Captured Inline Transient Storage Logs (transientLogs array):
          </span>

          <div className="bg-[#0B0B0E] border border-[#222228] rounded-xl overflow-hidden font-mono text-xs">
            <div className="divide-y divide-[#181820]">
              {simulation.transientLogs.map((log, idx) => (
                <div key={idx} className="p-3 hover:bg-[#121217] transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-gray-500">#{idx + 1}</span>
                      <span className="text-gray-600">PC: 0x{log.pc.toString(16).padStart(4, "0")}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.op === "TSTORE"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {log.op}
                      </span>
                      <span className="text-xs text-gray-300 font-sans">{log.decodedMeaning}</span>
                    </div>

                    <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-3">
                      <span>Slot: <strong className="text-cyan-400">{log.slot.slice(0, 18)}...</strong></span>
                      {log.value && <span>Value: <strong className="text-amber-300">{log.value.slice(0, 18)}...</strong></span>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 text-xs font-bold">{log.gasCost} gas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Contrast Explanation */}
        <div className="p-4 bg-[#181822] rounded-xl border border-[#262638] flex items-start gap-3 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-bold text-white block">
              Why Standard Geth Tracers Miss Transient Storage:
            </span>
            <p className="text-gray-300">
              {simulation.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Code Explorer & Implementation Tabs */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23232A] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Production Geth Tracer Implementations
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCodeTab("js_tracer")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                activeCodeTab === "js_tracer"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-[#1E1E24] text-gray-400 hover:text-white"
              }`}
            >
              JavaScript Tracer
            </button>
            <button
              onClick={() => setActiveCodeTab("go_tracer")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                activeCodeTab === "go_tracer"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-[#1E1E24] text-gray-400 hover:text-white"
              }`}
            >
              Go Native Tracer
            </button>
            <button
              onClick={() => setActiveCodeTab("rpc_curl")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                activeCodeTab === "rpc_curl"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-[#1E1E24] text-gray-400 hover:text-white"
              }`}
            >
              cURL JSON-RPC Example
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="relative">
          <div className="absolute right-3 top-3 z-10">
            <button
              onClick={() => {
                const txt =
                  activeCodeTab === "js_tracer"
                    ? GETH_JAVASCRIPT_TRACER_CODE
                    : activeCodeTab === "go_tracer"
                    ? GETH_GO_NATIVE_TRACER_CODE
                    : curlRpcExample;
                handleCopy(txt, activeCodeTab);
              }}
              className="px-2.5 py-1 rounded bg-[#202028] hover:bg-[#2B2B36] text-gray-300 text-xs font-mono flex items-center gap-1 border border-[#2D2D38] transition cursor-pointer"
            >
              {copiedKey === activeCodeTab ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copy Code
            </button>
          </div>

          <pre className="p-4 bg-[#0A0B0E] border border-[#222228] rounded-xl text-cyan-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-96">
            {activeCodeTab === "js_tracer" && GETH_JAVASCRIPT_TRACER_CODE}
            {activeCodeTab === "go_tracer" && GETH_GO_NATIVE_TRACER_CODE}
            {activeCodeTab === "rpc_curl" && curlRpcExample}
          </pre>
        </div>
      </div>
    </div>
  );
};
