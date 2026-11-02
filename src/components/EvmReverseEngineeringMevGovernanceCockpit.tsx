import React, { useState, useMemo } from "react";
import {
  Binary,
  ShieldAlert,
  Zap,
  Terminal,
  Code2,
  Copy,
  Check,
  Search,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Sliders,
  Layers,
  Database,
  ArrowRight,
  Info,
  DollarSign,
  Lock,
  RefreshCw,
  Cpu,
  FileCode,
  Flame,
  BookOpen,
  FileText,
  Download,
} from "lucide-react";
import {
  KNOWN_SELECTOR_COLLISIONS,
  computeFunctionSelector,
  calculateNestedMappingSlot,
  calculateDynamicArraySlot,
  calculateTransientStorageSlot,
  calculateErc7201StorageSlot,
  evaluateGovernanceRisk,
  simulateFlashbotsBundle,
  DIRECT_COINBASE_ASSEMBLY_SNIPPET,
  SelectorCollisionSample,
  ADVANCED_SECURITY_MEV_ENGINEERING_MANUAL_MD,
  SAMPLE_DISPATCHER_TRACE,
} from "../utils/evmReverseEngineeringAndMevEngine";
import { GethTransientTracerView } from "./GethTransientTracerView";
import { PostgresDoubleEntryLedgerView } from "./PostgresDoubleEntryLedgerView";
import {
  FLASHBOTS_NODE_PIPELINE_CODE,
  FLASHBOTS_PYTHON_PIPELINE_CODE,
} from "../utils/doubleEntryLedgerAndGethTracerEngine";

export const EvmReverseEngineeringMevGovernanceCockpit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "bytecode_re" | "governance_audit" | "flashbots_mev" | "geth_tracer" | "double_entry_ledger" | "manual_synthesis"
  >("bytecode_re");
  const [flashbotsCodeLang, setFlashbotsCodeLang] = useState<"node" | "python">("node");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadManual = () => {
    const blob = new Blob([ADVANCED_SECURITY_MEV_ENGINEERING_MANUAL_MD], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Advanced_Smart_Contract_Security_and_MEV_Manual.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // STATE: 1. EVM REVERSE ENGINEERING & STORAGE CALCULATOR
  // =========================================================================
  const [customSignature, setCustomSignature] = useState<string>("burnAll()");
  const computedSelector = useMemo(() => computeFunctionSelector(customSignature), [customSignature]);

  // Nested Mapping Inputs
  const [nestedBaseSlot, setNestedBaseSlot] = useState<number>(0);
  const [nestedKey1, setNestedKey1] = useState<string>("0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao");
  const [nestedKey2, setNestedKey2] = useState<string>("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  const nestedSlotResult = useMemo(
    () => calculateNestedMappingSlot(nestedBaseSlot, nestedKey1, nestedKey2),
    [nestedBaseSlot, nestedKey1, nestedKey2]
  );

  // Dynamic Array Inputs
  const [arrayBaseSlot, setArrayBaseSlot] = useState<number>(1);
  const [arrayIndex, setArrayIndex] = useState<number>(5);
  const arraySlotResult = useMemo(
    () => calculateDynamicArraySlot(arrayBaseSlot, arrayIndex),
    [arrayBaseSlot, arrayIndex]
  );

  // Transient Storage EIP-1153 Input
  const [transientId, setTransientId] = useState<string>("TOKENWORLD_REENTRANCY_GUARD_SLOT");
  const transientSlotResult = useMemo(
    () => calculateTransientStorageSlot(transientId),
    [transientId]
  );

  // ERC-7201 Namespaced Storage Input
  const [namespaceId, setNamespaceId] = useState<string>("openzeppelin.storage.ERC20");
  const erc7201SlotResult = useMemo(
    () => calculateErc7201StorageSlot(namespaceId),
    [namespaceId]
  );

  // =========================================================================
  // STATE: 2. GOVERNANCE & MULTI-SIG AUDIT RISK MODEL
  // =========================================================================
  const [govProtocolName, setGovProtocolName] = useState<string>("OmniBridge Yield Vault");
  const [govTvlUsd, setGovTvlUsd] = useState<number>(120000000); // $120M TVL
  const [govRequiredSigners, setGovRequiredSigners] = useState<number>(2);
  const [govTotalSigners, setGovTotalSigners] = useState<number>(3);
  const [govTimelockHours, setGovTimelockHours] = useState<number>(12);
  const [govEmergencyPauser, setGovEmergencyPauser] = useState<boolean>(true);
  const [govInstantUpgrade, setGovInstantUpgrade] = useState<boolean>(false);
  const [govProxyPattern, setGovProxyPattern] = useState<"ERC-7201_NAMESPACED" | "UUPS_GAP" | "TRANSPARENT_NO_GAP" | "BEACON">("TRANSPARENT_NO_GAP");

  const governanceReport = useMemo(
    () =>
      evaluateGovernanceRisk({
        protocolName: govProtocolName,
        tvlUsd: govTvlUsd,
        requiredSigners: govRequiredSigners,
        totalSigners: govTotalSigners,
        timelockDelayHours: govTimelockHours,
        hasEmergencyPauserBypass: govEmergencyPauser,
        hasInstantImplementationUpgrade: govInstantUpgrade,
        proxyPattern: govProxyPattern,
      }),
    [govProtocolName, govTvlUsd, govRequiredSigners, govTotalSigners, govTimelockHours, govEmergencyPauser, govInstantUpgrade, govProxyPattern]
  );

  // =========================================================================
  // STATE: 3. FLASHBOTS MEV SEARCHER SANDBOX
  // =========================================================================
  const [mevTargetBlock, setMevTargetBlock] = useState<number>(21948210);
  const [mevUserTxReverts, setMevUserTxReverts] = useState<boolean>(true);
  const [mevAllowRevert, setMevAllowRevert] = useState<boolean>(true); // revertingTxHashes
  const [mevTipEth, setMevTipEth] = useState<number>(0.045);
  const [mevPaymentMethod, setMevPaymentMethod] = useState<"BLOCK_COINBASE_TRANSFER" | "ASSEMBLY_CALL" | "GAS_PRIORITY_FEE">("ASSEMBLY_CALL");

  const mevSimulation = useMemo(
    () =>
      simulateFlashbotsBundle({
        targetBlock: mevTargetBlock,
        userTxRevertsConditionally: mevUserTxReverts,
        allowUserTxRevert: mevAllowRevert,
        paymentMethod: mevPaymentMethod,
        tipAmountEth: mevTipEth,
      }),
    [mevTargetBlock, mevUserTxReverts, mevAllowRevert, mevPaymentMethod, mevTipEth]
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                EVM REVERSE ENGINEERING & AUDITING ENGINE
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                FLASHBOTS BUNDLE ARCHITECTURE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              EVM Bytecode Analysis, Governance Audits & MEV Routing
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Institutional-grade technical reference and interactive calculation engines covering unverified EVM bytecode decompilation, selector collisions, transient EIP-1153 & nested mapping storage layouts, multi-sig quorum vs. TVL failure analysis, and private transaction routing via Flashbots bundles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(window.location.href, "share_url")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#22222A] hover:bg-[#2A2A35] text-gray-200 text-xs font-semibold rounded-xl border border-[#2B2B33] transition"
            >
              {copiedKey === "share_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Share Suite
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[#1F1F23] overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "bytecode_re", label: "🔍 1. EVM Bytecode & Storage Layouts", icon: Binary },
            { id: "governance_audit", label: "🏛️ 2. Multi-Sig Governance & Quorum Risks", icon: ShieldAlert },
            { id: "flashbots_mev", label: "⚡ 3. Flashbots Bundles & MEV Pipeline", icon: Zap },
            { id: "geth_tracer", label: "🔬 4. EIP-1153 Geth Transient Tracer", icon: Terminal },
            { id: "double_entry_ledger", label: "📊 5. PostgreSQL Double-Entry Ledger (ACID)", icon: Database },
            { id: "manual_synthesis", label: "📖 6. Security & MEV Engineering Manual", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
                    : "bg-[#1E1E24] text-gray-300 hover:bg-[#25252D] hover:text-white border border-[#2B2B33]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: EVM REVERSE ENGINEERING & UNVERIFIED BYTECODE */}
      {/* ===================================================================== */}
      {activeTab === "bytecode_re" && (
        <div className="space-y-6">
          {/* Top Quick Guide Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#141418] border border-[#1E1E24] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Binary className="w-4 h-4" />
                4-Byte Selector Collisions
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                4-byte function hashes collide easily. Off-chain databases suggest names, but only tracing <code className="text-amber-300 font-mono">CALLDATALOAD</code> and masks in debuggers (<code className="text-gray-300">cast run</code>) verifies actual types.
              </p>
            </div>

            <div className="p-4 bg-[#141418] border border-[#1E1E24] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <Database className="w-4 h-4" />
                Modern Storage (EIP-1153)
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                <code className="text-cyan-300 font-mono">TSTORE / TLOAD</code> reset at transaction end and cost only 100 gas. They cannot be inspected post-tx via <code className="text-gray-300">eth_getStorageAt</code>.
              </p>
            </div>

            <div className="p-4 bg-[#141418] border border-[#1E1E24] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Terminal className="w-4 h-4" />
                Dedaub, Panoramix & Cast
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Use Dedaub & Panoramix for rapid control flow graph (CFG) decompilation, then verify storage slots with Foundry's <code className="text-emerald-300 font-mono">cast storage &lt;addr&gt; &lt;slot&gt;</code>.
              </p>
            </div>
          </div>

          {/* 1.1 SELECTOR COLLISIONS TABLE & CHECKER */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1F1F23]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Binary className="w-5 h-5 text-amber-400" />
                  Selector Collision Inspector & CALLDATALOAD Verification
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-world collisions where disparate signatures yield the identical 4-byte Keccak-256 method selector.
                </p>
              </div>

              {/* Custom Signature Hasher */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSignature}
                  onChange={(e) => setCustomSignature(e.target.value)}
                  placeholder="e.g. burnAll()"
                  className="bg-[#0D0E12] border border-[#2B2B33] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 w-44"
                />
                <span className="font-mono text-xs font-bold px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                  {computedSelector.bytes4}
                </span>
              </div>
            </div>

            {/* Collision Table */}
            <div className="grid grid-cols-1 gap-3">
              {KNOWN_SELECTOR_COLLISIONS.map((item, idx) => (
                <div key={idx} className="p-4 bg-[#111115] border border-[#22222A] rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                        Selector: {item.selectorHex}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.riskSeverity === "CRITICAL" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {item.riskSeverity} RISK
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(`cast 4byte-decode ${item.selectorHex}`, `cast_4byte_${idx}`)}
                        className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 bg-[#1A1A22] rounded border border-[#252530]"
                      >
                        {copiedKey === `cast_4byte_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Cast Decode
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-[#17171E] rounded-lg border border-[#22222C]">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Expected / Innocuous Routine:</span>
                      <code className="text-emerald-400 font-mono font-semibold">{item.signatureA}</code>
                    </div>
                    <div className="p-2.5 bg-[#17171E] rounded-lg border border-[#22222C]">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Trojan / Colliding Routine:</span>
                      <code className="text-rose-400 font-mono font-semibold">{item.signatureB}</code>
                    </div>
                  </div>

                  <p className="text-gray-300 text-xs leading-relaxed">
                    {item.explanation}
                  </p>

                  <div className="p-3 bg-[#181822] rounded-lg border border-[#252535] space-y-1">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Decompilation & Debugging Strategy:
                    </span>
                    <p className="text-gray-400 text-xs font-mono leading-relaxed">
                      {item.calldataValidationAdvice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1.2 STORAGE LAYOUT MATHEMATICS ENGINE */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Modern Storage Layout & Cryptographic Slot Derivation
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculate precise EVM storage slots for Transient Storage (EIP-1153), Nested Mappings, Dynamic Arrays, and ERC-7201 Namespaces.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CALCULATOR A: NESTED MAPPING */}
              <div className="bg-[#111115] border border-[#22222A] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Nested Mapping Derivation
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    keccak256(k2 || keccak256(k1 || slot))
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Base Slot</label>
                      <input
                        type="number"
                        value={nestedBaseSlot}
                        onChange={(e) => setNestedBaseSlot(Number(e.target.value))}
                        className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-400 block mb-1">Key 1 (Owner / Outer)</label>
                      <input
                        type="text"
                        value={nestedKey1}
                        onChange={(e) => setNestedKey1(e.target.value)}
                        className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono truncate"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Key 2 (Spender / Inner)</label>
                    <input
                      type="text"
                      value={nestedKey2}
                      onChange={(e) => setNestedKey2(e.target.value)}
                      className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono truncate"
                    />
                  </div>

                  <div className="p-3 bg-[#151720] rounded-lg border border-[#212433] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Derived EVM Storage Slot:</span>
                      <button
                        onClick={() => handleCopy(nestedSlotResult.derivedSlotHex, "nested_slot")}
                        className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 font-mono"
                      >
                        {copiedKey === "nested_slot" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Slot
                      </button>
                    </div>
                    <div className="font-mono text-xs text-cyan-300 break-all select-all font-bold">
                      {nestedSlotResult.derivedSlotHex}
                    </div>
                    <p className="text-[11px] text-gray-400 pt-1">
                      {nestedSlotResult.explanation}
                    </p>
                    <div className="pt-2 border-t border-[#202330]">
                      <span className="text-[10px] text-gray-500 font-mono block mb-1">CLI Query Command:</span>
                      <code className="text-xs text-amber-300 font-mono block select-all">
                        {nestedSlotResult.cliCommand}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* CALCULATOR B: DYNAMIC ARRAYS */}
              <div className="bg-[#111115] border border-[#22222A] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Dynamic Array Layout
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    keccak256(slot) + index
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Array Base Slot (Length)</label>
                      <input
                        type="number"
                        value={arrayBaseSlot}
                        onChange={(e) => setArrayBaseSlot(Number(e.target.value))}
                        className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Element Index (i)</label>
                      <input
                        type="number"
                        value={arrayIndex}
                        onChange={(e) => setArrayIndex(Number(e.target.value))}
                        className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[#181615] rounded-lg border border-[#30251c] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Element #{arrayIndex} Slot:</span>
                      <button
                        onClick={() => handleCopy(arraySlotResult.derivedSlotHex, "array_slot")}
                        className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 font-mono"
                      >
                        {copiedKey === "array_slot" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Slot
                      </button>
                    </div>
                    <div className="font-mono text-xs text-amber-300 break-all select-all font-bold">
                      {arraySlotResult.derivedSlotHex}
                    </div>
                    <p className="text-[11px] text-gray-400 pt-1">
                      {arraySlotResult.explanation}
                    </p>
                    <div className="pt-2 border-t border-[#30251c]">
                      <span className="text-[10px] text-gray-500 font-mono block mb-1">CLI Query Commands:</span>
                      <pre className="text-[11px] text-amber-300 font-mono select-all whitespace-pre-wrap">
                        {arraySlotResult.cliCommand}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* CALCULATOR C: TRANSIENT STORAGE (EIP-1153) */}
              <div className="bg-[#111115] border border-[#22222A] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Transient Storage (EIP-1153)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                    100 Gas Flat
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Transient Slot Identifier</label>
                    <input
                      type="text"
                      value={transientId}
                      onChange={(e) => setTransientId(e.target.value)}
                      className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-[#181422] rounded-lg border border-[#2c2138] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Transient Slot Key:</span>
                      <code className="text-purple-300 font-mono truncate max-w-[200px]">
                        {transientSlotResult.derivedSlotHex.slice(0, 16)}...
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-[#140f1f] rounded border border-[#241735]">
                        <span className="text-gray-500 block text-[10px]">TSTORE Cost:</span>
                        <span className="text-purple-300 font-bold">100 gas</span>
                      </div>
                      <div className="p-2 bg-[#140f1f] rounded border border-[#241735]">
                        <span className="text-gray-500 block text-[10px]">SSTORE Equivalent:</span>
                        <span className="text-rose-400 font-bold">22,100 gas</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-300 pt-1 leading-relaxed">
                      {transientSlotResult.explanation}
                    </div>

                    <div className="p-2 bg-purple-950/30 border border-purple-800/40 rounded text-[11px] text-purple-200">
                      <strong>Audit Rule:</strong> Because transient storage is discarded at transaction teardown, post-facto calls to <code className="text-purple-300 font-mono">eth_getStorageAt</code> always return zero. Debuggers must inspect trace opcodes directly.
                    </div>
                  </div>
                </div>
              </div>

              {/* CALCULATOR D: ERC-7201 NAMESPACED STORAGE */}
              <div className="bg-[#111115] border border-[#22222A] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ERC-7201 Namespaced Storage Layout
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    keccak256(keccak256(id)-1) & ~0xff
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Namespace Identifier ID</label>
                    <input
                      type="text"
                      value={namespaceId}
                      onChange={(e) => setNamespaceId(e.target.value)}
                      className="w-full bg-[#181820] border border-[#2B2B33] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-[#111b15] rounded-lg border border-[#1b3324] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Namespaced Root Slot:</span>
                      <button
                        onClick={() => handleCopy(erc7201SlotResult.derivedSlotHex, "erc7201_slot")}
                        className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-1 font-mono"
                      >
                        {copiedKey === "erc7201_slot" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Root Slot
                      </button>
                    </div>

                    <div className="font-mono text-xs text-emerald-300 break-all select-all font-bold">
                      {erc7201SlotResult.derivedSlotHex}
                    </div>

                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {erc7201SlotResult.explanation}
                    </p>

                    <div className="p-2 bg-emerald-950/30 border border-emerald-800/40 rounded text-[11px] text-emerald-200">
                      <strong>Zero-Collision Guarantee:</strong> Eliminates risk of storage corruption between proxy upgrades and multi-inheritance contracts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: SMART CONTRACT GOVERNANCE & UPGRADEABILITY AUDITS */}
      {/* ===================================================================== */}
      {activeTab === "governance_audit" && (
        <div className="space-y-6">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F1F23]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  Multi-Sig Threshold, TVL Risk & Upgradeability Governance Simulator
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Evaluate single point of failure (SPOF) risks, collusion incentives against protocol TVL, and timelock bypass roles.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  governanceReport.quorumRiskRating === "CRITICAL_SPOF"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : governanceReport.quorumRiskRating === "HIGH_RISK"
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                    : governanceReport.quorumRiskRating === "MODERATE"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}>
                  RATING: {governanceReport.quorumRiskRating.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Interactive Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Protocol Name</label>
                <input
                  type="text"
                  value={govProtocolName}
                  onChange={(e) => setGovProtocolName(e.target.value)}
                  className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Total Value Locked (TVL USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-500">$</span>
                  <input
                    type="number"
                    value={govTvlUsd}
                    onChange={(e) => setGovTvlUsd(Number(e.target.value))}
                    className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl pl-6 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Multi-Sig Threshold: {govRequiredSigners} of {govTotalSigners}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={govTotalSigners}
                    value={govRequiredSigners}
                    onChange={(e) => setGovRequiredSigners(Number(e.target.value))}
                    className="w-16 bg-[#111115] border border-[#2B2B33] rounded-xl px-2.5 py-2 text-xs text-white text-center"
                  />
                  <span className="text-xs text-gray-500">/</span>
                  <input
                    type="number"
                    min={govRequiredSigners}
                    max={20}
                    value={govTotalSigners}
                    onChange={(e) => setGovTotalSigners(Number(e.target.value))}
                    className="w-16 bg-[#111115] border border-[#2B2B33] rounded-xl px-2.5 py-2 text-xs text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Timelock Delay (Hours)
                </label>
                <input
                  type="number"
                  value={govTimelockHours}
                  onChange={(e) => setGovTimelockHours(Number(e.target.value))}
                  className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Privileged Roles Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3.5 bg-[#121217] rounded-xl border border-[#22222C] cursor-pointer hover:bg-[#16161F]">
                <input
                  type="checkbox"
                  checked={govEmergencyPauser}
                  onChange={(e) => setGovEmergencyPauser(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded bg-[#1F1F26] border-[#33333F]"
                />
                <div>
                  <span className="text-xs font-bold text-white block">PAUSER_ROLE Bypass</span>
                  <span className="text-[11px] text-gray-400 block">Emergency pause freezes users without delay</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 bg-[#121217] rounded-xl border border-[#22222C] cursor-pointer hover:bg-[#16161F]">
                <input
                  type="checkbox"
                  checked={govInstantUpgrade}
                  onChange={(e) => setGovInstantUpgrade(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded bg-[#1F1F26] border-[#33333F]"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Instant Upgrade Function</span>
                  <span className="text-[11px] text-gray-400 block">Implementation changes without timelock queue</span>
                </div>
              </label>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Proxy Storage Architecture</label>
                <select
                  value={govProxyPattern}
                  onChange={(e) => setGovProxyPattern(e.target.value as any)}
                  className="w-full bg-[#121217] border border-[#22222C] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="ERC-7201_NAMESPACED">ERC-7201 Namespaced Storage (Safest)</option>
                  <option value="UUPS_GAP">UUPS with __gap[50] Array</option>
                  <option value="TRANSPARENT_NO_GAP">Transparent Proxy without __gap (High Collision Risk)</option>
                  <option value="BEACON">Upgradeable Beacon</option>
                </select>
              </div>
            </div>

            {/* Assessment Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-[#121217] rounded-xl border border-[#22222C] space-y-2">
                <span className="text-xs text-gray-400">Collusion & Compromise Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-400">
                    {governanceReport.collusionVulnerabilityScore}
                  </span>
                  <span className="text-xs text-gray-500">/ 100 risk index</span>
                </div>
                <div className="w-full bg-[#202028] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                    style={{ width: `${governanceReport.collusionVulnerabilityScore}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#121217] rounded-xl border border-[#22222C] space-y-2">
                <span className="text-xs text-gray-400">Timelock Effectiveness</span>
                <div className="text-base font-bold text-white">
                  {governanceReport.timelockEffectiveRating === "COSMETIC_SAFEGUARD" ? (
                    <span className="text-rose-400">⚠️ Cosmetic Safeguard (Bypassable)</span>
                  ) : governanceReport.timelockEffectiveRating === "WEAK_DELAY" ? (
                    <span className="text-amber-400">⚠️ Weak Delay (&lt;48h)</span>
                  ) : (
                    <span className="text-emerald-400">🛡️ Defense-in-Depth</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Delay: {govTimelockHours}h. {govInstantUpgrade ? "Instant upgrade role bypasses the delay." : "No instant bytecode swaps."}
                </p>
              </div>

              <div className="p-4 bg-[#121217] rounded-xl border border-[#22222C] space-y-2">
                <span className="text-xs text-gray-400">Storage Collision Hazard</span>
                <div className="text-base font-bold text-white">
                  {governanceReport.proxyStorageCollisionRisk === "ZERO_NAMESPACED" ? (
                    <span className="text-emerald-400">🛡️ Zero (ERC-7201 Namespaced)</span>
                  ) : governanceReport.proxyStorageCollisionRisk === "LOW_VERIFIED_GAP" ? (
                    <span className="text-amber-400">⚠️ Low (Requires Manual Gap Tracking)</span>
                  ) : (
                    <span className="text-rose-400">🚨 High Hazard (Unstructured Storage)</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Pattern: {govProxyPattern}
                </p>
              </div>
            </div>

            {/* Audit Findings & Defense-in-Depth Recommendations */}
            <div className="p-4 bg-[#13131A] rounded-xl border border-[#20202A] space-y-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Audit Report Findings & Remediation Steps
              </span>

              <div className="space-y-2">
                {governanceReport.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 bg-[#181822] p-3 rounded-lg border border-[#252535]">
                    <span className="text-amber-400 font-bold font-mono">0{idx + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 3: FLASHBOTS BUNDLES & MEV ROUTING */}
      {/* ===================================================================== */}
      {activeTab === "flashbots_mev" && (
        <div className="space-y-6">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F1F23]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Flashbots Private Transaction Routing & Bundle Pre-Flight Simulator
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure atomic bundles, utilize <code className="text-amber-300 font-mono">revertingTxHashes</code> for resilient backruns, and execute revert-safe builder payments via <code className="text-amber-300 font-mono">block.coinbase.transfer</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  mevSimulation.simulationResult.bundleStatus === "INCLUDED_HEALTHY"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : mevSimulation.simulationResult.bundleStatus === "MINED_WITH_REVERT_IGNORED"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  BUNDLE STATUS: {mevSimulation.simulationResult.bundleStatus.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Target Block Number</label>
                <input
                  type="number"
                  value={mevTargetBlock}
                  onChange={(e) => setMevTargetBlock(Number(e.target.value))}
                  className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Target Tx Conditionally Reverts?</label>
                <select
                  value={mevUserTxReverts ? "yes" : "no"}
                  onChange={(e) => setMevUserTxReverts(e.target.value === "yes")}
                  className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="yes">Yes (Slippage Failure / Price Drift)</option>
                  <option value="no">No (Clean Execution)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Use revertingTxHashes Parameter?
                </label>
                <select
                  value={mevAllowRevert ? "yes" : "no"}
                  onChange={(e) => setMevAllowRevert(e.target.value === "yes")}
                  className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="yes">YES (Allow Target Tx to Revert)</option>
                  <option value="no">NO (Strict Bundle Atomicity)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Builder Tip Amount (ETH)</label>
                <input
                  type="number"
                  step="0.005"
                  value={mevTipEth}
                  onChange={(e) => setMevTipEth(Number(e.target.value))}
                  className="w-full bg-[#111115] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Explanation Banner on revertingTxHashes */}
            <div className="p-4 bg-[#181822] rounded-xl border border-[#262638] flex items-start gap-3 text-xs leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="font-bold text-white block">
                  Why <code className="text-amber-300 font-mono">revertingTxHashes</code> is Critical for Advanced Searcher Strategies:
                </span>
                <p className="text-gray-300">
                  By default, Flashbots enforces strict bundle atomicity: if <em>any</em> transaction reverts, the builder drops the entire bundle to protect the searcher. However, when backrunning volatile swaps or liquidations, setting <code className="text-amber-300 font-mono">revertingTxHashes: ["0x&lt;targetTx&gt;"]</code> allows the user's transaction to conditionally revert while still including your backrun or paying the builder, preventing unnecessary bundle dropouts.
                </p>
              </div>
            </div>

            {/* Bundle Transactions List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Bundle Transaction Sequence (Ordered in Block)
              </span>

              <div className="grid grid-cols-1 gap-2.5">
                {mevSimulation.transactions.map((tx, idx) => (
                  <div key={tx.id} className="p-3.5 bg-[#121217] border border-[#22222D] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-500 font-bold">#{idx + 1}</span>
                        <span className="font-bold text-white">{tx.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tx.simulatedStatus === "SUCCESS"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : tx.simulatedStatus === "REVERTED_ACCEPTED"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}>
                          {tx.simulatedStatus}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-gray-400 flex items-center gap-2">
                        <span>Hash: {tx.hash.slice(0, 18)}...</span>
                        <span>• Value: {tx.valueEth} ETH</span>
                        <span>• Gas: {tx.gasLimit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {tx.canRevert ? (
                        <span className="text-amber-300 font-mono text-[11px] px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30">
                          in revertingTxHashes
                        </span>
                      ) : (
                        <span className="text-gray-500 font-mono text-[11px]">
                          strict non-revert
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation Results & JSON-RPC Payload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Telemetry Card */}
              <div className="bg-[#121217] border border-[#22222D] rounded-xl p-5 space-y-4">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  eth_callBundle Simulation Telemetry
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#181822] rounded-lg border border-[#252535]">
                    <span className="text-gray-500 block text-[10px]">Bundle Status</span>
                    <span className="text-white font-bold">{mevSimulation.simulationResult.bundleStatus}</span>
                  </div>
                  <div className="p-3 bg-[#181822] rounded-lg border border-[#252535]">
                    <span className="text-gray-500 block text-[10px]">Total Gas Units</span>
                    <span className="text-cyan-400 font-bold">{mevSimulation.simulationResult.totalGasUsed.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-[#181822] rounded-lg border border-[#252535]">
                    <span className="text-gray-500 block text-[10px]">Builder Tip Transferred</span>
                    <span className="text-emerald-400 font-bold">{mevSimulation.simulationResult.builderProfitEth}</span>
                  </div>
                  <div className="p-3 bg-[#181822] rounded-lg border border-[#252535]">
                    <span className="text-gray-500 block text-[10px]">Effective Gas Price</span>
                    <span className="text-purple-400 font-bold">{mevSimulation.simulationResult.effectiveGasPriceGwei}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#181822] rounded-lg border border-[#252535] space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-gray-300 block">
                    Zero-Risk Builder Payout Strategy:
                  </span>
                  <p className="text-gray-400 leading-relaxed text-[11px]">
                    Passing tips via <code className="text-amber-300 font-mono">block.coinbase.transfer(amount)</code> or low-level assembly <code className="text-amber-300 font-mono">call(gas(), coinbase(), tip, 0,0,0,0)</code> ensures the builder receives compensation strictly upon successful transaction inclusion. If slippage aborts execution, the entire call reverts—zero base fee is burned and zero tip is paid.
                  </p>
                </div>
              </div>

              {/* JSON-RPC eth_callBundle Payload */}
              <div className="bg-[#121217] border border-[#22222D] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 font-mono">
                    JSON-RPC eth_callBundle Payload
                  </span>
                  <button
                    onClick={() => handleCopy(mevSimulation.simulationResult.rpcCallPayload, "rpc_payload")}
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono"
                  >
                    {copiedKey === "rpc_payload" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy RPC Body
                  </button>
                </div>

                <pre className="p-3 bg-[#0A0B0E] border border-[#1A1C24] rounded-lg text-emerald-400 font-mono text-[11px] leading-tight overflow-x-auto select-all max-h-56">
                  {mevSimulation.simulationResult.rpcCallPayload}
                </pre>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Target Relay: relay.flashbots.net</span>
                  <span>EIP-1559 Dynamic Base Fee Verified</span>
                </div>
              </div>
            </div>

            {/* Solidity Assembly Direct Coinbase Snippet */}
            <div className="p-5 bg-[#121217] border border-[#22222D] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-orange-400" />
                  Solidity Assembly: Zero-Risk Conditional Builder Payout Implementation
                </span>
                <button
                  onClick={() => handleCopy(DIRECT_COINBASE_ASSEMBLY_SNIPPET, "sol_coinbase")}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono"
                >
                  {copiedKey === "sol_coinbase" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy Solidity
                </button>
              </div>

              <pre className="p-3 bg-[#0A0B0E] border border-[#1A1C24] rounded-lg text-gray-300 font-mono text-[11px] leading-tight overflow-x-auto select-all max-h-64">
                {DIRECT_COINBASE_ASSEMBLY_SNIPPET}
              </pre>
            </div>

            {/* Complete Production Flashbots Bundle Pipeline */}
            <div className="p-5 bg-[#121217] border border-[#22222D] rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1E1E26]">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Complete Flashbots MEV Bundle Pipeline (@flashbots/ethers-provider-bundle)
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Production pipeline simulating (<code className="text-amber-300 font-mono">eth_callBundle</code>) and submitting (<code className="text-amber-300 font-mono">eth_sendBundle</code>) atomic bundles with reversion protection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#181822] rounded-lg p-0.5 border border-[#262635]">
                    <button
                      onClick={() => setFlashbotsCodeLang("node")}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${
                        flashbotsCodeLang === "node"
                          ? "bg-amber-500/20 text-amber-300 font-bold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Node.js (ethers-v6)
                    </button>
                    <button
                      onClick={() => setFlashbotsCodeLang("python")}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${
                        flashbotsCodeLang === "python"
                          ? "bg-amber-500/20 text-amber-300 font-bold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Python (web3.py)
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const code = flashbotsCodeLang === "node" ? FLASHBOTS_NODE_PIPELINE_CODE : FLASHBOTS_PYTHON_PIPELINE_CODE;
                      handleCopy(code, "flashbots_full_pipeline");
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono px-2.5 py-1 rounded bg-[#181822] border border-[#262635] cursor-pointer"
                  >
                    {copiedKey === "flashbots_full_pipeline" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy Pipeline
                  </button>
                </div>
              </div>

              {/* 4 Core Principles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-[#16161E] rounded-lg border border-[#22222E]">
                  <strong className="text-amber-300 block text-[11px]">1. Auth Signer Isolation</strong>
                  <span className="text-gray-400 text-[11px] leading-tight">
                    Dedicated zero-balance key used strictly for cryptographic reputation identity without risking trading capital.
                  </span>
                </div>
                <div className="p-2.5 bg-[#16161E] rounded-lg border border-[#22222E]">
                  <strong className="text-cyan-300 block text-[11px]">2. Pre-Flight Simulation</strong>
                  <span className="text-gray-400 text-[11px] leading-tight">
                    <code className="text-cyan-200">eth_callBundle</code> checks state deltas and reverts prior to broadcast, saving gas.
                  </span>
                </div>
                <div className="p-2.5 bg-[#16161E] rounded-lg border border-[#22222E]">
                  <strong className="text-purple-300 block text-[11px]">3. revertingTxHashes</strong>
                  <span className="text-gray-400 text-[11px] leading-tight">
                    Allows specified non-fatal tx hashes to safely revert, preserving backrun inclusion across volatile swaps.
                  </span>
                </div>
                <div className="p-2.5 bg-[#16161E] rounded-lg border border-[#22222E]">
                  <strong className="text-emerald-300 block text-[11px]">4. Zero Public Mempool</strong>
                  <span className="text-gray-400 text-[11px] leading-tight">
                    Direct RPC relay prevents frontrunning and generalized searcher sandwich attacks.
                  </span>
                </div>
              </div>

              <pre className="p-3 bg-[#0A0B0E] border border-[#1A1C24] rounded-lg text-amber-300 font-mono text-[11px] leading-relaxed overflow-x-auto select-all max-h-72">
                {flashbotsCodeLang === "node" ? FLASHBOTS_NODE_PIPELINE_CODE : FLASHBOTS_PYTHON_PIPELINE_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 4: EIP-1153 GETH TRANSIENT STORAGE TRACER */}
      {/* ===================================================================== */}
      {activeTab === "geth_tracer" && (
        <GethTransientTracerView />
      )}

      {/* ===================================================================== */}
      {/* SECTION 5: POSTGRESQL DOUBLE-ENTRY LEDGER (ACID & CONSTRAINTS) */}
      {/* ===================================================================== */}
      {activeTab === "double_entry_ledger" && (
        <PostgresDoubleEntryLedgerView />
      )}

      {/* ===================================================================== */}
      {/* SECTION 6: ADVANCED SECURITY & MEV ENGINEERING MANUAL SYNTHESIS */}
      {/* ===================================================================== */}
      {activeTab === "manual_synthesis" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    MANUAL SYNTHESIS
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ACTIONABLE DEFENSE-IN-DEPTH
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  Advanced Smart Contract Security & MEV Engineering Manual
                </h2>
                <p className="text-xs text-gray-400 max-w-3xl">
                  Synthesized technical guide connecting dynamic EVM reverse engineering, Cancun EIP-1153 transient storage, ERC-7201 namespaced upgradeability audits, and Flashbots private MEV routing.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadManual}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Manual (.md)
                </button>
                <button
                  onClick={() => handleCopy(ADVANCED_SECURITY_MEV_ENGINEERING_MANUAL_MD, "manual_md")}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#22222A] hover:bg-[#2A2A35] text-gray-200 text-xs font-semibold rounded-xl border border-[#2B2B33] transition cursor-pointer"
                >
                  {copiedKey === "manual_md" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Markdown
                </button>
              </div>
            </div>

            {/* Core Takeaways 4-Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-[#111116] border border-[#20202A] rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Binary className="w-4 h-4" />
                  1. Reverse Eng & Bytecode
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Static decompilers miss dynamic pathways. Tracing with <code className="text-amber-300 font-mono">cast run</code> verifies <code className="text-gray-300">CALLDATALOAD</code> masks and blocks 4-byte selector spoofing ($2^{32}$ collision space).
                </p>
              </div>

              <div className="p-4 bg-[#111116] border border-[#20202A] rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  2. State Innovations (EIP-1153)
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  <code className="text-purple-300 font-mono">TSTORE / TLOAD</code> reset post-tx and leave <strong>zero state trie footprint</strong>. Auditors must use dynamic opcode tracing because <code className="text-gray-300">eth_getStorageAt</code> returns null.
                </p>
              </div>

              <div className="p-4 bg-[#111116] border border-[#20202A] rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  3. Governance & ERC-7201
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Quorum ratios must scale with TVL (flagging 2-of-3 on $100M+ TVL). Enforce ERC-7201 namespaced storage to mathematically eliminate proxy upgrade collisions.
                </p>
              </div>

              <div className="p-4 bg-[#111116] border border-[#20202A] rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  4. MEV & Flashbots
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Pre-flight validation via <code className="text-cyan-300 font-mono">eth_callBundle</code>, selective backrun tolerance via <code className="text-cyan-300 font-mono">revertingTxHashes</code>, and zero-risk <code className="text-gray-300">block.coinbase.transfer</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Dispatcher Routing & Selector Verification Interactive Trace */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Dynamic Dispatcher Routing & Execution Stack Walkthrough
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  How the EVM decodes function selectors: <code className="text-amber-300 font-mono">PUSH4 0xXXXXXXXX → EQ → JUMPI</code> pipeline and parameter sanitization.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded">
                EVM Execution Frame
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border border-[#23232D] rounded-xl overflow-hidden">
                <thead className="bg-[#121217] text-gray-400 border-b border-[#23232D] text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Step</th>
                    <th className="py-2.5 px-3">Opcode</th>
                    <th className="py-2.5 px-3">Operand</th>
                    <th className="py-2.5 px-3">Stack Top</th>
                    <th className="py-2.5 px-3">Security & Audit Significance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D1D26] bg-[#0E0E12] text-gray-300">
                  {SAMPLE_DISPATCHER_TRACE.map((step) => (
                    <tr key={step.step} className="hover:bg-[#161620]">
                      <td className="py-2 px-3 text-gray-500 font-bold">{step.step}</td>
                      <td className="py-2 px-3 font-bold text-orange-400">{step.opcode}</td>
                      <td className="py-2 px-3 text-cyan-300">{step.operand}</td>
                      <td className="py-2 px-3 text-emerald-400 break-all">{step.stackAfter.join(" | ")}</td>
                      <td className="py-2 px-3 text-gray-400 text-[11px] font-sans">{step.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-[#121218] border border-[#22222D] rounded-xl text-xs space-y-1.5">
              <span className="font-bold text-amber-300 block">
                Verification Protocol against 4-Byte Collision Spoofing:
              </span>
              <p className="text-gray-300 text-xs leading-relaxed font-sans">
                Because an attacker can brute-force a signature yielding any arbitrary 4-byte hash within $2^{32}$ combinations (e.g. creating a malicious <code className="text-rose-400 font-mono">burnAll()</code> that collides with <code className="text-emerald-400 font-mono">deposit(uint256)</code>), auditors must trace past the <code className="text-amber-300 font-mono">JUMPI</code> target. Ensure the parameters extracted with <code className="text-cyan-300 font-mono">CALLDATALOAD</code> undergo strict type constraint validation: checking calldata bounds (<code className="text-gray-400 font-mono">CALLDATASIZE &gt;= 0x24</code>) and applying bitwise address masks (<code className="text-gray-400 font-mono">AND 0x00...ffff</code>) to guarantee safety.
              </p>
            </div>
          </div>

          {/* Full Markdown Reference Viewer */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-400" />
                Complete Manual Source (Markdown Specification)
              </span>
              <button
                onClick={() => handleCopy(ADVANCED_SECURITY_MEV_ENGINEERING_MANUAL_MD, "manual_full")}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono"
              >
                {copiedKey === "manual_full" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Raw Markdown
              </button>
            </div>

            <pre className="p-4 bg-[#0A0B0E] border border-[#1B1D25] rounded-xl text-gray-300 font-mono text-xs leading-relaxed overflow-x-auto select-all max-h-[500px]">
              {ADVANCED_SECURITY_MEV_ENGINEERING_MANUAL_MD}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
