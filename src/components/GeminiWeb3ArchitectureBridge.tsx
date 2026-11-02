import React, { useState, useEffect, useMemo } from "react";
import {
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Key,
  Globe,
  Wallet,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code2,
  Lock,
  Sliders,
  ArrowRight,
  Layers,
  FileCode2,
  Activity,
} from "lucide-react";
import {
  DEFAULT_CONTRACT_ALLOW_LIST,
  AllowListedContractEntry,
  GEMINI_FUNCTION_DECLARATION_SCHEMAS,
  ExtractedGeminiToolCall,
  parseAndValidateWeb3Intent,
  requestGeminiWeb3Intent,
  Erc4337SessionKeyPolicy,
  createNewErc4337SessionKey,
  evaluateTransactionAgainstPolicy,
  buildUnsignedTransactionFromIntent,
  SigningCustodyMode,
  SignedTransactionBundle,
  executeMultiModeSigning,
} from "../utils/geminiWeb3BridgeOrchestrator";
import { SUPPORTED_RPC_NODES, Web3RpcClient } from "../utils/cryptographicEnclaveBridgeEngine";
import { SignerComponent } from "./SignerComponent";
import { MetaMaskGeminiSwapBridgePanel } from "./MetaMaskGeminiSwapBridgePanel";

interface GeminiWeb3ArchitectureBridgeProps {
  onOpenUniversalWallet?: () => void;
}

const CURATED_PROMPT_SCENARIOS = [
  {
    id: "swap_valid_base",
    label: "Valid Swap ($17.25 < $25 Cap)",
    prompt: "Swap 0.005 ETH for USDC on Base and settle to Protocol Treasury",
    badge: "Passes Policy",
  },
  {
    id: "transfer_valid_usdc",
    label: "Valid Transfer (15 USDC)",
    prompt: "Transfer 15 USDC to 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0 on Ethereum",
    badge: "Passes Policy",
  },
  {
    id: "lp_mint_valid",
    label: "Valid LP Mint ($20 Depth)",
    prompt: "Mint concentrated liquidity pool position with 20 USD of ETH/USDC on Base",
    badge: "Passes Policy",
  },
  {
    id: "over_spend_cap",
    label: "Test Spending Cap Violation ($75 > $50/day)",
    prompt: "Transfer 75 USDC to 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
    badge: "Policy Halts",
  },
  {
    id: "unapproved_contract",
    label: "Test Allow-List Violation (Unknown Address)",
    prompt: "Transfer 10 USDC to 0xdead00000000000000000000000000000000beef",
    badge: "Policy Halts",
  },
];

export const GeminiWeb3ArchitectureBridge: React.FC<GeminiWeb3ArchitectureBridgeProps> = ({
  onOpenUniversalWallet,
}) => {
  // ==========================================================================
  // TIER 1: GEMINI INTELLIGENCE & PROMPT STATE
  // ==========================================================================
  const [userPrompt, setUserPrompt] = useState<string>(CURATED_PROMPT_SCENARIOS[0].prompt);
  const [isParsingIntent, setIsParsingIntent] = useState<boolean>(false);
  const [extractedIntent, setExtractedIntent] = useState<ExtractedGeminiToolCall>(() =>
    parseAndValidateWeb3Intent(CURATED_PROMPT_SCENARIOS[0].prompt)
  );
  const [selectedSchemaIndex, setSelectedSchemaIndex] = useState<number>(1); // prepareSwap default

  // ==========================================================================
  // TIER 2: ERC-4337 SESSION KEY, SPENDING CAPS & ALLOW-LIST STATE
  // ==========================================================================
  const [sessionPolicy, setSessionPolicy] = useState<Erc4337SessionKeyPolicy>(() =>
    createNewErc4337SessionKey({
      ttlMinutes: 120,
      maxSpendPerTxUsd: 25.0,
      maxSpendDailyUsd: 50.0,
      spentLast24hUsd: 12.5,
    })
  );
  const [allowList, setAllowList] = useState<AllowListedContractEntry[]>(
    () => DEFAULT_CONTRACT_ALLOW_LIST
  );
  const [liveNonce, setLiveNonce] = useState<number>(48);
  const [liveGasGwei, setLiveGasGwei] = useState<string>("14.2");
  const [liveBlockNumber, setLiveBlockNumber] = useState<number>(21849310);
  const [showViemSnippet, setShowViemSnippet] = useState<boolean>(false);

  // ==========================================================================
  // TIER 3: MULTI-MODE KEY CUSTODY & SIGNING LAYER STATE
  // ==========================================================================
  const [custodyMode, setCustodyMode] = useState<SigningCustodyMode>("AUTONOMOUS_AGENT_TEE");
  const [isSigningAndBroadcasting, setIsSigningAndBroadcasting] = useState<boolean>(false);
  const [signedBundle, setSignedBundle] = useState<SignedTransactionBundle | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);

  // ==========================================================================
  // TIER 4: NODE RPC & RECEIPT LEDGER STATE
  // ==========================================================================
  const [executionHistory, setExecutionHistory] = useState<
    Array<{
      id: string;
      timestamp: string;
      functionName: string;
      notionalUsd: number;
      custodyMode: SigningCustodyMode;
      txHash: string;
      chainId: number;
      blockNumber: number;
      status: "SETTLED_ON_CHAIN" | "BLOCKED_BY_POLICY";
    }>
  >([
    {
      id: "EXEC-9401",
      timestamp: new Date(Date.now() - 320000).toLocaleTimeString(),
      functionName: "prepareSwap",
      notionalUsd: 12.5,
      custodyMode: "AUTONOMOUS_AGENT_TEE",
      txHash: "0x8f92c14e8a77b3d54a0192837465bcde9182736455aabbccddeeff0011223344",
      chainId: 8453,
      blockNumber: 21849288,
      status: "SETTLED_ON_CHAIN",
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionRemainingText, setSessionRemainingText] = useState<string>("01h 59m 54s");

  // Session Key Expiration Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = Math.max(0, sessionPolicy.expiresAtEpochMs - Date.now());
      if (diffMs <= 0) {
        setSessionRemainingText("EXPIRED");
      } else {
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setSessionRemainingText(
          `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(
            secs
          ).padStart(2, "0")}s`
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionPolicy.expiresAtEpochMs]);

  // Query live RPC block & gas when chain changes
  const activeRpcNode = useMemo(() => {
    return (
      SUPPORTED_RPC_NODES.find((n) => n.chainId === extractedIntent.chainId) ||
      SUPPORTED_RPC_NODES[0]
    );
  }, [extractedIntent.chainId]);

  const refreshLiveNodeTelemetry = async () => {
    try {
      const client = new Web3RpcClient(activeRpcNode);
      const [block, fee, nonce] = await Promise.all([
        client.getLatestBlockNumber(),
        client.getFeeData(),
        client.getTransactionCount(sessionPolicy.smartAccountAddress),
      ]);
      if (block) setLiveBlockNumber(block);
      if (fee?.gasPriceGwei && fee.gasPriceGwei !== "N/A") {
        setLiveGasGwei(fee.gasPriceGwei);
      }
      if (typeof nonce === "number") {
        setLiveNonce(nonce);
      }
    } catch {
      // Retain last known node telemetry if public RPC rate limits
    }
  };

  useEffect(() => {
    refreshLiveNodeTelemetry();
  }, [activeRpcNode.chainId]);

  // Evaluate policy in real time against current extracted intent
  const policyEvaluation = useMemo(() => {
    return evaluateTransactionAgainstPolicy(extractedIntent, sessionPolicy, allowList);
  }, [extractedIntent, sessionPolicy, allowList]);

  // Build unsigned EIP-1559 transaction payload in real time
  const unsignedTransaction = useMemo(() => {
    return buildUnsignedTransactionFromIntent(
      extractedIntent,
      sessionPolicy.smartAccountAddress,
      liveNonce,
      liveGasGwei,
      "1.2"
    );
  }, [extractedIntent, sessionPolicy.smartAccountAddress, liveNonce, liveGasGwei]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Step 1: Parse Prompt with Gemini Function Calling
  const handleParsePromptWithGemini = async (customPrompt?: string) => {
    const targetPrompt = customPrompt !== undefined ? customPrompt : userPrompt;
    if (customPrompt !== undefined) {
      setUserPrompt(customPrompt);
    }
    setIsParsingIntent(true);
    setSignedBundle(null);
    setSigningError(null);
    try {
      const result = await requestGeminiWeb3Intent(targetPrompt);
      setExtractedIntent(result);
      const schemaIdx = GEMINI_FUNCTION_DECLARATION_SCHEMAS.findIndex(
        (s) => s.name === result.functionName
      );
      if (schemaIdx !== -1) {
        setSelectedSchemaIndex(schemaIdx);
      }
    } finally {
      setIsParsingIntent(false);
    }
  };

  // Step 3 & 4: Execute Multi-Mode Signing & Broadcast to Node RPC
  const handleSignAndBroadcast = async () => {
    setIsSigningAndBroadcasting(true);
    setSigningError(null);
    setSignedBundle(null);

    try {
      await new Promise((r) => setTimeout(r, 350));
      const bundle = await executeMultiModeSigning({
        mode: custodyMode,
        unsignedTx: unsignedTransaction,
        policy: sessionPolicy,
        policyResult: policyEvaluation,
      });

      setSignedBundle(bundle);

      // Update 24h rolling spend in session policy
      setSessionPolicy((prev) => ({
        ...prev,
        spentLast24hUsd: Number(
          (prev.spentLast24hUsd + extractedIntent.estimatedNotionalUsd).toFixed(2)
        ),
      }));

      setLiveNonce((prev) => prev + 1);

      setExecutionHistory((prev) => [
        {
          id: `EXEC-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toLocaleTimeString(),
          functionName: extractedIntent.functionName,
          notionalUsd: extractedIntent.estimatedNotionalUsd,
          custodyMode,
          txHash: bundle.txHash,
          chainId: extractedIntent.chainId,
          blockNumber: liveBlockNumber + 1,
          status: "SETTLED_ON_CHAIN",
        },
        ...prev,
      ]);
    } catch (err: any) {
      const msg = err?.message || "Signing halted by security guardrail.";
      setSigningError(msg);
      setExecutionHistory((prev) => [
        {
          id: `HALT-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toLocaleTimeString(),
          functionName: extractedIntent.functionName,
          notionalUsd: extractedIntent.estimatedNotionalUsd,
          custodyMode,
          txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          chainId: extractedIntent.chainId,
          blockNumber: liveBlockNumber,
          status: "BLOCKED_BY_POLICY",
        },
        ...prev,
      ]);
    } finally {
      setIsSigningAndBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* ====================================================================
          TOP ARCHITECTURAL BLUEPRINT BANNER
         ==================================================================== */}
      <div className="bg-[#0A0B10] border border-[#1E2338] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2338] pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
              3-TIER AI-TO-WEB3 ARCHITECTURAL BOUNDARY · ZERO LLM KEY CUSTODY
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Gemini Function Calling Intelligence → Viem/Ethers Orchestration → Isolated Enclave Signing
            </h2>
            <p className="text-xs text-slate-400 max-w-4xl">
              Language models act strictly as intent and parameter extraction engines (`prepareTransfer`, `prepareSwap`), never as custodians or raw hex signers. Bytecode compilation, ERC-4337 spending limits, and deterministic secp256k1 signing are enforced in isolated execution layers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={refreshLiveNodeTelemetry}
              className="px-3 py-2 rounded-lg bg-[#121422] hover:bg-[#191C30] border border-[#252B45] text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sync Node (#{liveBlockNumber.toLocaleString()})</span>
            </button>
            {onOpenUniversalWallet && (
              <button
                type="button"
                onClick={onOpenUniversalWallet}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Browser Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Stage Pipeline Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-[#121422] border border-[#1E2338] space-y-1">
            <div className="flex items-center justify-between text-cyan-400">
              <span>TIER 1 · INTELLIGENCE</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white truncate">
              Gemini API ({extractedIntent.functionName})
            </div>
            <div className="text-[11px] text-slate-400">
              Structured JSON Tool Call · Zero Private Keys
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#121422] border border-[#1E2338] space-y-1">
            <div className="flex items-center justify-between text-indigo-400">
              <span>TIER 2 · ORCHESTRATION</span>
              {policyEvaluation.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className="font-bold text-white truncate">
              Viem / Ethers + Policy Gate
            </div>
            <div className="text-[11px] text-slate-400">
              Notional: ${extractedIntent.estimatedNotionalUsd.toFixed(2)} USD ·{" "}
              {policyEvaluation.passed ? "Policy Passed" : "Halted by Policy"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#121422] border border-[#1E2338] space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <span>TIER 3 · KEY CUSTODY</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white truncate">
              {custodyMode === "NON_CUSTODIAL_WALLET"
                ? "Option A: MetaMask / Rabby"
                : custodyMode === "EMBEDDED_MPC_PASSKEY"
                ? "Option B: Privy / Dynamic MPC"
                : "Option C: Turnkey TEE Enclave"}
            </div>
            <div className="text-[11px] text-slate-400">
              Session Key TTL: {sessionRemainingText}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#121422] border border-[#1E2338] space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span>TIER 4 · NODE RPC</span>
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white truncate">
              {activeRpcNode.name} (Chain {activeRpcNode.chainId})
            </div>
            <div className="text-[11px] text-slate-400">
              Nonce: #{liveNonce} · Gas: {liveGasGwei} Gwei
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MAIN 2-COLUMN WORKBENCH
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 6 COLUMNS: TIER 1 (GEMINI INTENT) + TIER 2 (UNSIGNED TX & POLICY) */}
        <div className="lg:col-span-6 space-y-6">
          {/* TIER 1 PANEL */}
          <div className="bg-[#0A0B10] border border-[#1E2338] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-3">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 uppercase block">
                  STEP 1 · INTELLIGENCE LAYER (GOOGLE AI STUDIO / GEMINI API)
                </span>
                <h3 className="text-base font-bold text-white">
                  Natural Language Intent Parser & Function Declaration
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {extractedIntent.modelUsed}
              </span>
            </div>

            {/* Curated Scenario Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400">
                Select Test Prompt Scenario (Valid vs. Policy Violations):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CURATED_PROMPT_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleParsePromptWithGemini(sc.prompt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition cursor-pointer ${
                      userPrompt === sc.prompt
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold"
                        : "bg-[#121422] border-[#1E2338] text-slate-300 hover:text-white"
                    }`}
                  >
                    {sc.label} · {sc.badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Natural Language Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block">
                User Prompt (Never include private keys or seed phrases):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., Swap 0.005 ETH for USDC on Base..."
                  className="flex-1 bg-[#121422] border border-[#252B45] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => handleParsePromptWithGemini()}
                  disabled={isParsingIntent}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isParsingIntent ? "Parsing..." : "Parse Intent"}</span>
                </button>
              </div>
            </div>

            {/* Extracted Tool Call Output vs Function Schema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#121422] border border-[#1E2338] space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Gemini Tool Call Output:</span>
                  <span className="text-emerald-400">
                    {extractedIntent.functionName}()
                  </span>
                </div>
                <pre className="text-[11px] text-cyan-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    {
                      name: extractedIntent.functionName,
                      args: extractedIntent.args,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-[#121422] border border-[#1E2338] space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Function Declaration Schema:</span>
                  <select
                    value={selectedSchemaIndex}
                    onChange={(e) => setSelectedSchemaIndex(Number(e.target.value))}
                    className="bg-[#0A0B10] border border-[#252B45] rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                  >
                    {GEMINI_FUNCTION_DECLARATION_SCHEMAS.map((s, idx) => (
                      <option key={s.name} value={idx}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <pre className="text-[10px] text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
                  {JSON.stringify(
                    GEMINI_FUNCTION_DECLARATION_SCHEMAS[selectedSchemaIndex],
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            {/* Security Boundary Verification Notes */}
            <div className="p-3 rounded-lg bg-[#121422] border border-[#1E2338] space-y-1 text-[11px] font-mono">
              {extractedIntent.validationNotes.map((note, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TIER 2 PANEL: UNSIGNED PAYLOAD & ERC-4337 POLICY ENGINE */}
          <div className="bg-[#0A0B10] border border-[#1E2338] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-3">
              <div>
                <span className="text-[11px] font-mono text-indigo-400 uppercase block">
                  STEP 2 · CLIENT/BACKEND ORCHESTRATION (VIEM / ETHERS.JS)
                </span>
                <h3 className="text-base font-bold text-white">
                  Unsigned Payload Builder & ERC-4337 Session Key Policy Gate
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowViemSnippet((prev) => !prev)}
                className="px-2.5 py-1 rounded bg-[#121422] hover:bg-[#191C30] border border-[#252B45] text-[11px] font-mono text-indigo-300 cursor-pointer"
              >
                {showViemSnippet ? "View Calldata" : "View Viem Code"}
              </button>
            </div>

            {showViemSnippet ? (
              <div className="p-3 rounded-lg bg-[#121422] border border-[#1E2338] space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>TypeScript Serialization (Viem / Ethers.js):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(unsignedTransaction.viemCodeSnippet, "viem_code")}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {copiedId === "viem_code" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy Code</span>
                  </button>
                </div>
                <pre className="text-[11px] text-indigo-200 overflow-x-auto leading-relaxed">
                  {unsignedTransaction.viemCodeSnippet}
                </pre>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-[#121422] border border-[#1E2338]">
                  <span className="text-[10px] text-slate-400 block">Target Contract (to):</span>
                  <span className="text-white font-bold truncate block">
                    {unsignedTransaction.to.slice(0, 10)}...{unsignedTransaction.to.slice(-6)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121422] border border-[#1E2338]">
                  <span className="text-[10px] text-slate-400 block">Estimated Notional:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    ${extractedIntent.estimatedNotionalUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121422] border border-[#1E2338]">
                  <span className="text-[10px] text-slate-400 block">Gas Limit & Max Fee:</span>
                  <span className="text-white tabular-nums">
                    {Number(unsignedTransaction.gasLimit).toLocaleString()} · {unsignedTransaction.maxFeePerGasGwei} Gwei
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-[#121422] border border-[#1E2338] space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>ABI Method: {unsignedTransaction.decodedMethodSignature}</span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(unsignedTransaction.unsignedSerializedHex, "unsigned_hex")
                  }
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copiedId === "unsigned_hex" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy Unsigned Hex</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                Unsigned RLP Payload: {unsignedTransaction.unsignedSerializedHex}
              </div>
            </div>

            {/* Interactive ERC-4337 Session Key & Spending Limit Controls */}
            <div className="p-4 rounded-lg bg-[#121422] border border-[#252B45] space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>ERC-4337 Session Key & Spending Policy Controls</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSessionPolicy((prev) =>
                        createNewErc4337SessionKey({
                          ttlMinutes: 120,
                          maxSpendPerTxUsd: prev.maxSpendPerTxUsd,
                          maxSpendDailyUsd: prev.maxSpendDailyUsd,
                          spentLast24hUsd: 0,
                        })
                      )
                    }
                    className="px-2.5 py-1 rounded bg-[#191D30] hover:bg-[#232842] border border-[#2E3554] text-[11px] text-cyan-300 cursor-pointer"
                  >
                    Rotate Session Key & Reset 24h Spend
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Max Per-Tx Cap ($ USD):
                  </label>
                  <input
                    type="number"
                    value={sessionPolicy.maxSpendPerTxUsd}
                    onChange={(e) =>
                      setSessionPolicy((prev) => ({
                        ...prev,
                        maxSpendPerTxUsd: Math.max(1, Number(e.target.value) || 25),
                      }))
                    }
                    className="w-full bg-[#0A0B10] border border-[#252B45] rounded px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    24h Daily Cap ($ USD):
                  </label>
                  <input
                    type="number"
                    value={sessionPolicy.maxSpendDailyUsd}
                    onChange={(e) =>
                      setSessionPolicy((prev) => ({
                        ...prev,
                        maxSpendDailyUsd: Math.max(5, Number(e.target.value) || 50),
                      }))
                    }
                    className="w-full bg-[#0A0B10] border border-[#252B45] rounded px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    24h Spent So Far ($ USD):
                  </label>
                  <div className="px-2.5 py-1.5 rounded bg-[#0A0B10] border border-[#252B45] text-amber-300 font-bold tabular-nums">
                    ${sessionPolicy.spentLast24hUsd.toFixed(2)} / ${sessionPolicy.maxSpendDailyUsd.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Policy Check Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {policyEvaluation.sessionKeyValid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-slate-300">Session Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {policyEvaluation.withinPerTxLimit ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-slate-300">Per-Tx Limit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {policyEvaluation.withinDailyLimit ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-slate-300">24h Spend Cap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {policyEvaluation.contractAllowListed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-slate-300">Allow-Listed</span>
                </div>
              </div>

              {!policyEvaluation.passed && (
                <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px] space-y-1">
                  {policyEvaluation.rejectionReasons.map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 6 COLUMNS: TIER 3 (MULTI-MODE SIGNING) + TIER 4 (RPC BROADCAST & ALLOW-LIST) */}
        <div className="lg:col-span-6 space-y-6">
          {/* TIER 3 PANEL: MULTI-MODE KEY CUSTODY & SIGNING LAYER */}
          <div className="bg-[#0A0B10] border border-[#1E2338] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-3">
              <div>
                <span className="text-[11px] font-mono text-amber-400 uppercase block">
                  STEP 3 · KEY CUSTODY & SIGNING LAYER (3 PRODUCTION ABSTRACTIONS)
                </span>
                <h3 className="text-base font-bold text-white">
                  Offload Key Custody & Execute Deterministic Signing
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">secp256k1</span>
            </div>

            {/* 3 Custody Abstraction Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setCustodyMode("NON_CUSTODIAL_WALLET")}
                className={`p-3 rounded-lg border text-left transition cursor-pointer space-y-1.5 ${
                  custodyMode === "NON_CUSTODIAL_WALLET"
                    ? "bg-amber-500/15 border-amber-400 text-white"
                    : "bg-[#121422] border-[#1E2338] text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-[10px] text-amber-400 font-bold">
                  OPTION A · USER DAPP
                </div>
                <div className="font-bold text-white">MetaMask / Rabby</div>
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Client-side non-custodial. User inspects simulation & approves in browser extension.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCustodyMode("EMBEDDED_MPC_PASSKEY")}
                className={`p-3 rounded-lg border text-left transition cursor-pointer space-y-1.5 ${
                  custodyMode === "EMBEDDED_MPC_PASSKEY"
                    ? "bg-cyan-500/15 border-cyan-400 text-white"
                    : "bg-[#121422] border-[#1E2338] text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-[10px] text-cyan-400 font-bold">
                  OPTION B · EMBEDDED MPC
                </div>
                <div className="font-bold text-white">Privy / Dynamic</div>
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Passkey + 2-of-3 MPC key shards. Neither your backend nor the LLM ever sees the full key.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCustodyMode("AUTONOMOUS_AGENT_TEE")}
                className={`p-3 rounded-lg border text-left transition cursor-pointer space-y-1.5 ${
                  custodyMode === "AUTONOMOUS_AGENT_TEE"
                    ? "bg-emerald-500/15 border-emerald-400 text-white"
                    : "bg-[#121422] border-[#1E2338] text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-[10px] text-emerald-400 font-bold">
                  OPTION C · AGENT TEE
                </div>
                <div className="font-bold text-white">Turnkey / Nitro TEE</div>
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Keys isolated in Secure Enclave. Signs automatically only if ERC-4337 policy passes.
                </div>
              </button>
            </div>

            {/* Primary Sign & Broadcast Action Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSignAndBroadcast}
                disabled={isSigningAndBroadcasting}
                className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                  policyEvaluation.passed
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950"
                    : "bg-rose-600/90 hover:bg-rose-500 text-white"
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isSigningAndBroadcasting
                    ? "Verifying Policy & Signing in Isolated Enclave..."
                    : policyEvaluation.passed
                    ? `Sign via ${
                        custodyMode === "NON_CUSTODIAL_WALLET"
                          ? "MetaMask / Rabby"
                          : custodyMode === "EMBEDDED_MPC_PASSKEY"
                          ? "Embedded Passkey MPC"
                          : "Turnkey TEE Enclave"
                      } & Broadcast (eth_sendRawTransaction)`
                    : "Attempt Sign (Will Test Policy Engine Block)"}
                </span>
              </button>
            </div>

            {/* Policy Rejection Alert or Signed Bytecode Output */}
            {signingError && (
              <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-500/50 font-mono text-xs text-rose-200 space-y-1">
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>SIGNING ENCLAVE REFUSED REQUEST</span>
                </div>
                <div className="text-[11px]">{signingError}</div>
              </div>
            )}

            {signedBundle && (
              <div className="p-4 rounded-lg bg-[#121422] border border-emerald-500/40 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Signed Raw Bytecode (0x02f8...) & Enclave Attestation</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    v={signedBundle.signatureComponents.v} (yParity={signedBundle.signatureComponents.yParity})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#0A0B10] border border-[#1E2338] truncate">
                    <span className="text-slate-500 block">r:</span>
                    <span className="text-purple-300">{signedBundle.signatureComponents.r}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0A0B10] border border-[#1E2338] truncate">
                    <span className="text-slate-500 block">s:</span>
                    <span className="text-purple-300">{signedBundle.signatureComponents.s}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0A0B10] border border-[#1E2338] space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Signed Raw Transaction Hex:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(signedBundle.signedRawBytecodeHex, "signed_raw")}
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copiedId === "signed_raw" ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="text-slate-200 break-all">
                    {signedBundle.signedRawBytecodeHex}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TIER 4 PANEL: ALLOW-LIST REGISTRY & ON-CHAIN EXECUTION LOG */}
          <div className="bg-[#0A0B10] border border-[#1E2338] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-3">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 uppercase block">
                  STEP 4 · CONTRACT ALLOW-LIST & NODE RPC EXECUTION LEDGER
                </span>
                <h3 className="text-base font-bold text-white">
                  Pre-Approved Contracts & Mempool Broadcast Audit Trail
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {allowList.filter((a) => a.enabled).length} Active Contracts
              </span>
            </div>

            {/* Allow-List Toggle Table */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="text-[11px] text-slate-400">
                Toggle Contract Allow-List Permissions (Unchecking blocks agent access):
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-[#1E2338] border border-[#1E2338] rounded-lg bg-[#121422]">
                {allowList.map((item) => (
                  <label
                    key={item.address}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[#171A2C] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() =>
                          setAllowList((prev) =>
                            prev.map((entry) =>
                              entry.address === item.address
                                ? { ...entry, enabled: !entry.enabled }
                                : entry
                            )
                          )
                        }
                        className="rounded border-slate-600 text-cyan-500 focus:ring-0"
                      />
                      <div className="truncate">
                        <span className="text-white font-semibold">{item.label}</span>
                        <span className="text-slate-400 text-[11px] ml-2">
                          {item.address.slice(0, 8)}...{item.address.slice(-6)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-400 shrink-0 ml-2">
                      {item.category}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Execution History Table */}
            <div className="space-y-2 font-mono text-xs">
              <div className="text-[11px] text-slate-400">
                Live Mempool Broadcast & Policy Enforcement Log:
              </div>
              <div className="overflow-x-auto border border-[#1E2338] rounded-lg bg-[#121422]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E2338] text-[10px] text-slate-400 uppercase">
                      <th className="py-2 px-3">Time / ID</th>
                      <th className="py-2 px-3">Intent</th>
                      <th className="py-2 px-3 text-right">Notional</th>
                      <th className="py-2 px-3">Custody Mode</th>
                      <th className="py-2 px-3 text-right">Status / Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2338] text-[11px]">
                    {executionHistory.slice(0, 5).map((row) => (
                      <tr key={row.id} className="hover:bg-[#171A2C]">
                        <td className="py-2 px-3 tabular-nums text-slate-300">
                          {row.timestamp} · {row.id}
                        </td>
                        <td className="py-2 px-3 text-cyan-300 font-semibold">
                          {row.functionName}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-white">
                          ${row.notionalUsd.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {row.custodyMode === "AUTONOMOUS_AGENT_TEE"
                            ? "Turnkey TEE"
                            : row.custodyMode === "EMBEDDED_MPC_PASSKEY"
                            ? "Privy MPC"
                            : "MetaMask"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.status === "SETTLED_ON_CHAIN" ? (
                            <a
                              href={`${activeRpcNode.explorerUrl}/tx/${row.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{row.txHash.slice(0, 8)}...</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-rose-400 font-bold">BLOCKED BY POLICY</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 4-COMPONENT METAMASK + GEMINI `executeSwap` + 0x/UNISWAP BRIDGE    */}
      {/* ================================================================== */}
      <MetaMaskGeminiSwapBridgePanel
        onSwapExecutedInMetaMask={(res) => {
          setLiveNonce((prev) => prev + 1);
          setExecutionHistory((prev) => [
            {
              id: `MM-${Math.floor(1000 + Math.random() * 9000)}`,
              timestamp: new Date().toLocaleTimeString(),
              functionName: "prepareSwap",
              notionalUsd: parseFloat(res.sellAmountHuman) * (res.sellToken === "ETH" ? 3450 : 1),
              custodyMode: "NON_CUSTODIAL_WALLET",
              txHash: res.txHash,
              chainId: res.chainId,
              blockNumber: liveBlockNumber + 1,
              status: "SETTLED_ON_CHAIN",
            },
            ...prev,
          ]);
        }}
      />

      {/* ================================================================== */}
      {/* DEDICATED VIEM + METAMASK / COINBASE SIGNER COMPONENT              */}
      {/* ================================================================== */}
      <SignerComponent
        externalGeminiIntent={extractedIntent}
        onTransactionSignedAndApproved={(receipt) => {
          setLiveNonce((prev) => prev + 1);
          setExecutionHistory((prev) => [
            {
              id: `VIEM-${Math.floor(1000 + Math.random() * 9000)}`,
              timestamp: receipt.timestamp,
              functionName: receipt.functionName,
              notionalUsd: extractedIntent.estimatedNotionalUsd,
              custodyMode: "NON_CUSTODIAL_WALLET",
              txHash: receipt.txHash,
              chainId: receipt.chainId,
              blockNumber: receipt.blockNumber,
              status: "SETTLED_ON_CHAIN",
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
};
