import React, { useState, useEffect, useMemo } from "react";
import {
  Code2,
  Cpu,
  Layers,
  Database,
  Shield,
  Zap,
  Globe,
  Wallet,
  Landmark,
  HardDrive,
  Download,
  Copy,
  Check,
  RefreshCw,
  Play,
  Terminal,
  Activity,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Key,
  Lock,
  Sliders,
  DollarSign,
  Send,
  Binary,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  AVAILABLE_SOLIDITY_VERSIONS,
  EVM_TARGETS,
  CONTRACT_TEMPLATES,
  compileSoliditySource,
  CompilationResult,
} from "../utils/solidityCompilerEngine";
import {
  DEFAULT_EINSTEIN_DAR_PARAMS,
  evaluateEinsteinDarFormula,
  EinsteinDarParameters,
  EinsteinDarEvaluationResult,
} from "../utils/einsteinDarLogicFormula";
import {
  fossibotMemoryCardClient,
  MemoryCardState,
  MemoryCardBackupItem,
} from "../utils/fossibotDeviceMemoryCard";
import {
  GLOBAL_BANK_RAILS,
  GlobalBankRail,
  BankSettlementQuoteRequest,
  BankSettlementTransaction,
  processBankToMetaMaskSettlement,
} from "../utils/globalBanksApiGateway";
import {
  SUPPORTED_METAMASK_NETWORKS,
  RpcNetworkDefinition,
  ConstructedTransaction,
  GasFeeEstimation,
  SignedTransactionPayload,
  BroadcastSettlementResult,
  generateBip39Mnemonic,
  deriveDeterministicAccount,
  constructEvmTransaction,
  estimateEip1559GasFees,
  signTransactionOffline,
  simulateBroadcastAndSettlement,
} from "../utils/metaMaskArchitectureEngine";
import { Web3FullStackArchitectureCockpit } from "./Web3FullStackArchitectureCockpit";
import { FuzzingSuitePanel } from "./FuzzingSuitePanel";
import { EvmReverseEngineeringMevGovernanceCockpit } from "./EvmReverseEngineeringMevGovernanceCockpit";
import { UnverifiedBytecodeInspectorPanel } from "./UnverifiedBytecodeInspectorPanel";
import { FullstackTokenServiceManagerModal } from "./FullstackTokenServiceManagerModal";
import { PostgresDoubleEntryLedgerView } from "./PostgresDoubleEntryLedgerView";
import { CryptographicKeyEnclaveSigningBridge } from "./CryptographicKeyEnclaveSigningBridge";

export type SubModuleTab =
  | "compiler"
  | "fullstack_manager"
  | "fuzzing"
  | "bytecode_inspector"
  | "evm_audit"
  | "postgres_ledger"
  | "web3_architecture"
  | "key_enclaves"
  | "einstein_dar"
  | "fossibot"
  | "banks"
  | "metamask_architecture";

interface Props {
  onSendToRemix?: (solidityCode: string, tokenName: string) => void;
  onOpenMetaMaskTransferModal?: (mode?: "send" | "receive") => void;
}

export const SolidityCompilerFullstackView: React.FC<Props> = ({
  onSendToRemix,
  onOpenMetaMaskTransferModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubModuleTab>("compiler");

  // ==========================================
  // 1. SOLIDITY COMPILER STATE
  // ==========================================
  const [selectedVersion, setSelectedVersion] = useState<string>("0.8.28");
  const [selectedEvmTarget, setSelectedEvmTarget] = useState<string>("cancun");
  const [optimizerEnabled, setOptimizerEnabled] = useState<boolean>(true);
  const [optimizerRuns, setOptimizerRuns] = useState<number>(200);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("einstein_dar");
  const [solidityCode, setSolidityCode] = useState<string>(CONTRACT_TEMPLATES.einstein_dar.code);
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilerTab, setCompilerTab] = useState<"abi" | "bytecode" | "opcodes" | "selectors" | "gas">("abi");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // ==========================================
  // 2. EINSTEIN-DAR LOGIC FIELD FORMULA STATE
  // ==========================================
  const [einsteinParams, setEinsteinParams] = useState<EinsteinDarParameters>(DEFAULT_EINSTEIN_DAR_PARAMS);
  const [einsteinResult, setEinsteinResult] = useState<EinsteinDarEvaluationResult>(() =>
    evaluateEinsteinDarFormula(DEFAULT_EINSTEIN_DAR_PARAMS)
  );

  // ==========================================
  // 3. FOSSIBOT MEMORY CARD STATE
  // ==========================================
  const [fossibotState, setFossibotState] = useState<MemoryCardState>(fossibotMemoryCardClient.getState());
  const [newCardPin, setNewCardPin] = useState<string>("777980");
  const [memoryCardNotice, setMemoryCardNotice] = useState<string | null>(null);

  useEffect(() => {
    return fossibotMemoryCardClient.subscribe((s) => setFossibotState(s));
  }, []);

  // ==========================================
  // 4. ALL BANKS API GATEWAY STATE
  // ==========================================
  const [selectedBankId, setSelectedBankId] = useState<string>("fednow_us");
  const [sourceCurrency, setSourceCurrency] = useState<string>("USD");
  const [sourceAmount, setSourceAmount] = useState<number>(50000);
  const [targetAsset, setTargetAsset] = useState<BankSettlementQuoteRequest["targetAsset"]>("ED-LOGIC");
  const [recipientMetaMask, setRecipientMetaMask] = useState<string>("0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao");
  const [settledBankTxs, setSettledBankTxs] = useState<BankSettlementTransaction[]>([]);
  const [isProcessingBankWire, setIsProcessingBankWire] = useState<boolean>(false);

  // ==========================================
  // 5. METAMASK PLATFORM ARCHITECTURE STATE
  // ==========================================
  const [metaMaskSubStep, setMetaMaskSubStep] = useState<1 | 2 | 3 | 4>(1);
  const [metaMaskNetwork, setMetaMaskNetwork] = useState<RpcNetworkDefinition>(SUPPORTED_METAMASK_NETWORKS[0]);
  const [bip39SeedPhrase, setBip39SeedPhrase] = useState<string>(() => generateBip39Mnemonic(12));
  const [derivedAccountIndex, setDerivedAccountIndex] = useState<number>(0);
  const derivedAccount = useMemo(() => {
    return deriveDeterministicAccount(bip39SeedPhrase, derivedAccountIndex);
  }, [bip39SeedPhrase, derivedAccountIndex]);

  // Transfer Wizard State
  const [txRecipient, setTxRecipient] = useState<string>("0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao");
  const [txAssetType, setTxAssetType] = useState<ConstructedTransaction["assetType"]>("ERC-20_TOKEN");
  const [txAmount, setTxAmount] = useState<string>("1000");
  const [txGasSpeed, setTxGasSpeed] = useState<GasFeeEstimation["speedTier"]>("MARKET");
  const [constructedTx, setConstructedTx] = useState<ConstructedTransaction | null>(null);
  const [gasEstimation, setGasEstimation] = useState<GasFeeEstimation | null>(null);
  const [signedTxPayload, setSignedTxPayload] = useState<SignedTransactionPayload | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastSettlementResult | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // Handle template change
  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (CONTRACT_TEMPLATES[key]) {
      setSolidityCode(CONTRACT_TEMPLATES[key].code);
    }
  };

  // Compile Solidity
  const handleRunCompilation = () => {
    setIsCompiling(true);
    setTimeout(() => {
      const res = compileSoliditySource(solidityCode, {
        version: selectedVersion,
        evmTarget: selectedEvmTarget,
        optimizerEnabled,
        optimizerRuns,
      });
      setCompilationResult(res);
      setIsCompiling(false);
    }, 400);
  };

  // Initial compile on mount
  useEffect(() => {
    handleRunCompilation();
  }, []);

  // Evaluate Einstein-Dar formula
  const handleRecalculateEinsteinDar = () => {
    const res = evaluateEinsteinDarFormula(einsteinParams);
    setEinsteinResult(res);
  };

  // Save compiled artifact to Fossibot MicroSD Card
  const handleSaveToFossibot = () => {
    if (!compilationResult) return;
    try {
      fossibotMemoryCardClient.saveArtifactToMemoryCard(
        `${compilationResult.contractName}_v${selectedVersion}.twbin`,
        "BYTECODE_BIN",
        JSON.stringify(compilationResult, null, 2),
        true
      );
      setMemoryCardNotice(`Successfully stored ${compilationResult.contractName} bytecode artifact to Fossibot MicroSD Card!`);
      setTimeout(() => setMemoryCardNotice(null), 4000);
    } catch (e: any) {
      setMemoryCardNotice(`Error: ${e?.message}`);
      setTimeout(() => setMemoryCardNotice(null), 4000);
    }
  };

  // Save Einstein-Dar proof to Fossibot MicroSD
  const handleSaveProofToFossibot = () => {
    try {
      fossibotMemoryCardClient.saveArtifactToMemoryCard(
        `EinsteinDar_Proof_${Date.now().toString().slice(-6)}.twproof`,
        "EINSTEIN_DAR_PROOF",
        JSON.stringify(einsteinResult, null, 2),
        true
      );
      setMemoryCardNotice("Sovereign Einstein-Dar Proof attestation backed up to Fossibot MicroSD Secure Enclave!");
      setTimeout(() => setMemoryCardNotice(null), 4000);
    } catch (e: any) {
      setMemoryCardNotice(`Error: ${e?.message}`);
      setTimeout(() => setMemoryCardNotice(null), 4000);
    }
  };

  // Bank Settlement Execution
  const handleExecuteBankSettlement = () => {
    setIsProcessingBankWire(true);
    setTimeout(() => {
      const tx = processBankToMetaMaskSettlement({
        bankRailId: selectedBankId,
        sourceCurrency,
        sourceAmount,
        recipientMetaMaskAddress: recipientMetaMask,
        targetAsset,
      });
      setSettledBankTxs((prev) => [tx, ...prev]);
      setIsProcessingBankWire(false);
    }, 700);
  };

  // Step 1: Construct Tx
  const handleConstructTx = () => {
    const tx = constructEvmTransaction({
      from: derivedAccount.address,
      to: txRecipient,
      amount: txAmount,
      assetType: txAssetType,
      tokenContractAddress: "0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao",
      tokenSymbol: targetAsset,
      chainId: metaMaskNetwork.chainId,
    });
    setConstructedTx(tx);
    const gas = estimateEip1559GasFees(tx, txGasSpeed);
    setGasEstimation(gas);
    setMetaMaskSubStep(2);
  };

  // Step 2: Confirm Gas & Proceed to Sign
  const handleConfirmGas = () => {
    if (!constructedTx) return;
    const gas = estimateEip1559GasFees(constructedTx, txGasSpeed);
    setGasEstimation(gas);
    setMetaMaskSubStep(3);
  };

  // Step 3: Sign Offline
  const handleSignTransaction = () => {
    if (!constructedTx || !gasEstimation) return;
    const signed = signTransactionOffline(constructedTx, gasEstimation, derivedAccount.privateKey);
    setSignedTxPayload(signed);
    setMetaMaskSubStep(4);
  };

  // Step 4: Broadcast to RPC Node
  const handleBroadcastTransaction = () => {
    if (!signedTxPayload) return;
    setIsBroadcasting(true);
    setTimeout(() => {
      const res = simulateBroadcastAndSettlement(signedTxPayload, metaMaskNetwork);
      setBroadcastResult(res);
      setIsBroadcasting(false);
    }, 1200);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Banner Notice */}
      {memoryCardNotice && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between text-sm animate-pulse">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <span>{memoryCardNotice}</span>
          </div>
          <button onClick={() => setMemoryCardNotice(null)} className="text-emerald-400 hover:text-white">
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                Solidity Multi-Version v0.8.28
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Property-Based Fuzzing Suite
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Einstein-Dar Logic Field Formula
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                Fossibot MicroSD Enclave
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                32+ Global Banks API
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                MetaMask Non-Custodial Architecture
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Solidity Compiler & Web3 Platform Engine
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Fullstack source code compilation across EVM target versions (Cancun to Petersburg),
              unified with the <strong>Property-Based Fuzzing Suite</strong> for automated invariant validation,
              the relativistic <strong>Einstein-Dar Logic Field Formula</strong>,
              physical <strong>Fossibot MicroSD Memory Card</strong> cold storage client,
              instant <strong>All Banks API</strong> ISO 20022 wire gateway, and comprehensive{" "}
              <strong>MetaMask Architecture & 4-Step Self-Custodial Transfer Engine</strong>.
            </p>
            <div className="text-xs text-orange-400/90 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Sovereign Creator: Mauro Lomibao Dar III • Taurus King of God Zeus Mao-Mao • Sole Owner of Token World & TREE3
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[200px]">
            <button
              onClick={() => fossibotMemoryCardClient.toggleMount()}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                fossibotState.isMounted
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30"
              }`}
            >
              <HardDrive className="w-4 h-4" />
              {fossibotState.isMounted ? "FOSSIBOT CARD: MOUNTED" : "MOUNT FOSSIBOT CARD"}
            </button>

            <button
              onClick={() => onOpenMetaMaskTransferModal && onOpenMetaMaskTransferModal("send")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F27D26] hover:bg-[#ff8f3d] text-white border border-orange-400/30 transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Send className="w-4 h-4" />
              Send via MetaMask
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[#1F1F23] overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "compiler", label: "⚡ 1. Solidity Compiler Studio", icon: Code2 },
            { id: "fullstack_manager", label: "💎 2. Fullstack Trillions & UINT256 Token Manager", icon: Sparkles },
            { id: "fuzzing", label: "🛡️ 3. Property-Based Fuzzing Suite", icon: ShieldCheck },
            { id: "bytecode_inspector", label: "🔍 4. Unverified Bytecode Inspector", icon: ShieldAlert },
            { id: "evm_audit", label: "🔬 5. EVM Reverse Eng, Governance & Flashbots", icon: Binary },
            { id: "postgres_ledger", label: "📊 6. PostgreSQL Double-Entry Ledger (ACID & Safe Settlement)", icon: Database },
            { id: "web3_architecture", label: "🌐 7. Modern Full-Stack Web3 Architecture", icon: Layers },
            { id: "key_enclaves", label: "🔐 8. Key Management & Secure Enclaves (Web3 Signing Bridge)", icon: Key },
            { id: "einstein_dar", label: "🌌 9. Einstein-Dar Logic Field Formula", icon: Sparkles },
            { id: "fossibot", label: "💾 10. Fossibot Device Memory Card", icon: HardDrive },
            { id: "banks", label: "🏛️ 11. All Banks API Gateway (ISO 20022)", icon: Landmark },
            { id: "metamask_architecture", label: "🦊 12. MetaMask Platform Architecture", icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as SubModuleTab)}
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

      {/* ========================================================================= */}
      {/* TAB 1: SOLIDITY COMPILER STUDIO */}
      {/* ========================================================================= */}
      {activeSubTab === "compiler" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Compiler Version */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Solidity Compiler Version
                </label>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  {AVAILABLE_SOLIDITY_VERSIONS.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} {v.recommended ? "★ (Recommended)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {AVAILABLE_SOLIDITY_VERSIONS.find((v) => v.version === selectedVersion)?.notes}
                </p>
              </div>

              {/* EVM Target */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  EVM Target Version
                </label>
                <select
                  value={selectedEvmTarget}
                  onChange={(e) => setSelectedEvmTarget(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  {EVM_TARGETS.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()} {t === "cancun" ? "(EIP-1153 TSTORE)" : t === "shanghai" ? "(PUSH0)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">Configures target opcode instructions & gas schedules</p>
              </div>

              {/* Optimizer Settings */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">Optimizer Enabled</label>
                  <input
                    type="checkbox"
                    checked={optimizerEnabled}
                    onChange={(e) => setOptimizerEnabled(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    disabled={!optimizerEnabled}
                    value={optimizerRuns}
                    onChange={(e) => setOptimizerRuns(Number(e.target.value))}
                    min={1}
                    max={10000000}
                    className="w-full bg-[#0A0A0C] border border-[#2B2B33] disabled:opacity-40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-gray-400">runs</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">200 for standard, 10,000+ for high-frequency trading</p>
              </div>

              {/* Preset Template */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Select Contract Preset
                </label>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  {Object.entries(CONTRACT_TEMPLATES).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">Preloaded high-standard verified Solidity sources</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1F1F23]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCompilation}
                  disabled={isCompiling}
                  className="px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isCompiling ? "animate-spin" : ""}`} />
                  {isCompiling ? "Compiling Solidity..." : `Compile Source (v${selectedVersion})`}
                </button>

                {onSendToRemix && (
                  <button
                    onClick={() => onSendToRemix(solidityCode, compilationResult?.contractName || "Contract")}
                    className="px-4 py-2.5 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Remix 2.5.4
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab("fuzzing")}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Test with Fuzzing Suite
                </button>

                <button
                  onClick={handleSaveToFossibot}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Save to Fossibot MicroSD Card
                </button>

                <button
                  onClick={() => copyToClipboard(solidityCode, "source")}
                  className="px-4 py-2.5 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-gray-300 border border-[#2B2B33] text-xs sm:text-sm font-medium flex items-center gap-1.5 transition"
                >
                  {copiedSnippet === "source" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSnippet === "source" ? "Copied" : "Copy Code"}
                </button>
              </div>
            </div>
          </div>

          {/* Main Workspace: Code Editor & Compiler Output */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Solidity Code Editor */}
            <div className="lg:col-span-7 bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23] mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-gray-200">
                    Solidity Source ({CONTRACT_TEMPLATES[selectedTemplateKey]?.filename || "Contract.sol"})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  {solidityCode.split("\n").length} lines • {solidityCode.length} characters
                </span>
              </div>

              <textarea
                value={solidityCode}
                onChange={(e) => setSolidityCode(e.target.value)}
                spellCheck={false}
                className="w-full flex-1 min-h-[460px] bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-4 font-mono text-xs text-emerald-300/90 leading-relaxed focus:outline-none focus:border-orange-500 resize-y"
              />
            </div>

            {/* Compilation Output Inspector */}
            <div className="lg:col-span-5 bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23] mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-200">Compilation Artifacts</span>
                </div>
                {compilationResult && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-400 border border-green-500/30">
                    Compiled: {compilationResult.contractName}
                  </span>
                )}
              </div>

              {/* Output Sub-Tabs */}
              <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded-xl border border-[#1F1F23] mb-3 overflow-x-auto scrollbar-none">
                {[
                  { id: "abi", label: `ABI (${compilationResult?.abi.length || 0})` },
                  { id: "bytecode", label: "Bytecode" },
                  { id: "opcodes", label: `Opcodes (${compilationResult?.opcodes.length || 0})` },
                  { id: "selectors", label: `Selectors (${compilationResult?.methodSelectors.length || 0})` },
                  { id: "gas", label: "Gas Profile" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCompilerTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      compilerTab === t.id
                        ? "bg-[#F27D26] text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Output Content */}
              <div className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-3 font-mono text-xs overflow-auto max-h-[460px]">
                {compilationResult ? (
                  <>
                    {/* TAB: ABI */}
                    {compilerTab === "abi" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                          <span className="text-[11px] text-gray-400">JSON Interface</span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(compilationResult.abi, null, 2), "abi")}
                            className="text-orange-400 hover:text-orange-300 text-[11px] flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy ABI
                          </button>
                        </div>
                        <pre className="text-gray-300 text-[11px] leading-tight overflow-x-auto">
                          {JSON.stringify(compilationResult.abi, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* TAB: BYTECODE */}
                    {compilerTab === "bytecode" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-gray-400 text-[11px]">
                            <span>Creation Bytecode ({(compilationResult.bytecode.length / 2).toLocaleString()} bytes)</span>
                            <button
                              onClick={() => copyToClipboard(compilationResult.bytecode, "bin")}
                              className="text-orange-400 hover:text-orange-300 text-[11px] flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                          <div className="p-2 bg-[#121215] rounded text-[11px] text-amber-300 break-all select-all">
                            {compilationResult.bytecode}
                          </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-[#1F1F23]">
                          <span className="text-[11px] text-gray-400">Deployed Runtime Bytecode</span>
                          <div className="p-2 bg-[#121215] rounded text-[11px] text-cyan-300 break-all select-all">
                            {compilationResult.deployedBytecode}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveSubTab("bytecode_inspector")}
                          className="w-full mt-3 py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Inspect in Unverified Bytecode Inspector (Reentrancy, Selfdestruct, Delegatecall)
                        </button>
                      </div>
                    )}

                    {/* TAB: OPCODES */}
                    {compilerTab === "opcodes" && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#1F1F23] text-gray-400 text-[11px]">
                          <span>EVM Opcode Instructions</span>
                          <span>{compilationResult.opcodes.length} ops</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-2">
                          {compilationResult.opcodes.map((op, idx) => (
                            <div key={idx} className="px-2 py-1 bg-[#121215] rounded border border-[#1F1F23] text-[10px] text-gray-300 flex items-center justify-between">
                              <span className="text-gray-500 font-mono">{idx}:</span>
                              <span className="text-orange-400 font-bold">{op}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB: SELECTORS */}
                    {compilerTab === "selectors" && (
                      <div className="space-y-2">
                        <div className="text-[11px] text-gray-400 pb-1.5 border-b border-[#1F1F23]">
                          4-Byte Keccak-256 Method Selectors
                        </div>
                        {compilationResult.methodSelectors.map((m, idx) => (
                          <div key={idx} className="p-2 bg-[#121215] rounded border border-[#1F1F23] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-cyan-400 text-[11px]">{m.selector}</span>
                              <span className="text-[10px] uppercase text-gray-500">{m.type}</span>
                            </div>
                            <div className="text-[10px] text-gray-300 truncate">{m.signature}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TAB: GAS PROFILE */}
                    {compilerTab === "gas" && (
                      <div className="space-y-3">
                        <div className="p-3 bg-[#121215] rounded border border-[#1F1F23] space-y-1">
                          <span className="text-gray-400 text-[11px]">Estimated Creation / Deployment Gas</span>
                          <div className="text-lg font-extrabold text-orange-400">
                            {compilationResult.gasEstimates.creationCost.toLocaleString()} units
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-gray-400 text-[11px]">Execution Gas by Method</span>
                          {Object.entries(compilationResult.gasEstimates.methods).map(([fn, gas]) => (
                            <div key={fn} className="flex items-center justify-between p-2 bg-[#121215] rounded border border-[#1F1F23] text-[11px]">
                              <span className="text-gray-300 truncate max-w-[200px]">{fn}</span>
                              <span className="text-cyan-400 font-bold">{gas.toLocaleString()} gas</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    Click "Compile Source" to run the Solidity compiler.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FULLSTACK TRILLIONS & UINT256 CONTRACT MANAGER */}
      {/* ========================================================================= */}
      {activeSubTab === "fullstack_manager" && (
        <FullstackTokenServiceManagerModal
          onSelectToken={(t) => {
            if (onSendToRemix) {
              onSendToRemix(
                `// SPDX-License-Identifier: MIT\npragma solidity 0.8.28;\n// FullStack CREATE2 Contract: ${t.contractAddress}\n// Name: ${t.name} (${t.symbol})`,
                t.name
              );
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROPERTY-BASED FUZZING SUITE & INVARIANT TESTING */}
      {/* ========================================================================= */}
      {activeSubTab === "fuzzing" && (
        <FuzzingSuitePanel
          compilationResult={compilationResult}
          onOpenSolidityCompiler={() => setActiveSubTab("compiler")}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UNVERIFIED BYTECODE INSPECTOR (REENTRANCY, SELFDESTRUCT, DELEGATECALL) */}
      {/* ========================================================================= */}
      {activeSubTab === "bytecode_inspector" && (
        <UnverifiedBytecodeInspectorPanel
          compiledBytecode={compilationResult?.deployedBytecode || compilationResult?.bytecode}
          compiledContractName={compilationResult?.contractName}
          onOpenCompilerTab={() => setActiveSubTab("compiler")}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EVM REVERSE ENGINEERING, GOVERNANCE AUDITING & FLASHBOTS MEV */}
      {/* ========================================================================= */}
      {activeSubTab === "evm_audit" && (
        <EvmReverseEngineeringMevGovernanceCockpit />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: POSTGRESQL DOUBLE-ENTRY LEDGER (ACID & SAFE SETTLEMENT) */}
      {/* ========================================================================= */}
      {activeSubTab === "postgres_ledger" && (
        <PostgresDoubleEntryLedgerView />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EINSTEIN-DAR LOGIC FIELD FORMULA */}
      {/* ========================================================================= */}
      {activeSubTab === "einstein_dar" && (
        <div className="space-y-6">
          {/* Formula Display Panel */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">
                  Einstein-Dar Relativistic Logic Field Equation
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Mauro Lomibao Dar III Formulation
              </span>
            </div>

            {/* LaTeX Equation Visualizer */}
            <div className="p-5 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl text-center space-y-3">
              <div className="text-base sm:text-xl font-mono text-cyan-300 tracking-wide font-semibold overflow-x-auto py-2">
                {"F_{Einstein-Dar}(Ψ) = E ⊗ D_{Taurus}(Ψ) = ∇ · (λ_{TREE3} × G_{MaoMao}) + ℏ ∑_{k=1}^N B_k · e^{i(ω_k t - k · r)}"}
              </div>
              <div className="text-sm font-mono text-amber-300">
                {"Relativistic Energy-Liquidity Equivalence: E = m · c_{block}²"}
              </div>
              <p className="text-xs text-gray-400 max-w-2xl mx-auto">
                Unifies sovereign digital reserve mass, block propagation speed, cosmological TREE3 curvature,
                Zeus Mao-Mao gravitational field, and multi-bank coherent wavepackets into an invariant Web3 space-time state.
              </p>
            </div>

            {/* Interactive Formula Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Reserve Mass (M_reserve in Sovereign units)
                </label>
                <input
                  type="number"
                  value={einsteinParams.reserveMass}
                  onChange={(e) =>
                    setEinsteinParams((p) => ({ ...p, reserveMass: Number(e.target.value) }))
                  }
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Block Speed Velocity (c_block)
                </label>
                <input
                  type="number"
                  value={einsteinParams.blockSpeedVelocity}
                  onChange={(e) =>
                    setEinsteinParams((p) => ({ ...p, blockSpeedVelocity: Number(e.target.value) }))
                  }
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  TREE3 Constant (λ_TREE3)
                </label>
                <input
                  type="number"
                  value={einsteinParams.tree3CosmologicalConstant}
                  onChange={(e) =>
                    setEinsteinParams((p) => ({ ...p, tree3CosmologicalConstant: Number(e.target.value) }))
                  }
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Mao-Mao Gravitational Field (G_MaoMao)
                </label>
                <input
                  type="number"
                  value={einsteinParams.maoMaoGravitationalPull}
                  onChange={(e) =>
                    setEinsteinParams((p) => ({ ...p, maoMaoGravitationalPull: Number(e.target.value) }))
                  }
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1F1F23]">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRecalculateEinsteinDar}
                  className="px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Evaluate Relativistic Field
                </button>
                <button
                  onClick={handleSaveProofToFossibot}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Back up Proof to Fossibot MicroSD
                </button>
              </div>

              <div className="text-xs font-mono text-gray-400">
                Sovereign Proof Hash:{" "}
                <span className="text-cyan-400">{einsteinResult.sovereignProofHash.slice(0, 24)}...</span>
              </div>
            </div>
          </div>

          {/* Evaluated Results Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 space-y-1">
              <span className="text-xs text-gray-400">Relativistic Energy (E = mc²)</span>
              <div className="text-xl font-extrabold text-orange-400 font-mono truncate">
                {einsteinResult.relativisticEnergy.toExponential(4)} J
              </div>
              <span className="text-[10px] text-gray-500">Liquidity energy potential scalar</span>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 space-y-1">
              <span className="text-xs text-gray-400">Dar-Taurus Curvature (R)</span>
              <div className="text-xl font-extrabold text-cyan-400 font-mono truncate">
                {einsteinResult.darTaurusCurvature.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-gray-500">Space-time invariant asset warp</span>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 space-y-1">
              <span className="text-xs text-gray-400">Gravitational Pull on Liquidity</span>
              <div className="text-xl font-extrabold text-emerald-400 font-mono truncate">
                {einsteinResult.gravitationalPullForce.toLocaleString(undefined, { maximumFractionDigits: 1 })} N
              </div>
              <span className="text-[10px] text-gray-500">Capital aggregation strength</span>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 space-y-1">
              <span className="text-xs text-gray-400">Multi-Bank Wave Coherence</span>
              <div className="text-xl font-extrabold text-purple-400 font-mono">
                {(einsteinResult.bankSuperpositionCoherence * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-gray-500">32 banking rails in phase</span>
            </div>
          </div>

          {/* Curvature Metric Tensor & Wavefunction Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-200">
                    Riemann-Dar 4x4 Metric Curvature Tensor (g_μν)
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">Relativistic Space-Time Matrix</span>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl font-mono text-xs">
                {einsteinResult.tensorMatrix.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-between py-1 border-b border-[#1F1F23]/50 last:border-none">
                    {row.map((val, cIdx) => (
                      <span key={cIdx} className={`w-20 text-center ${rIdx === cIdx ? "text-orange-400 font-bold" : "text-gray-500"}`}>
                        {val.toFixed(3)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                Diagonal coefficients represent gravitational time dilation (g₀₀), radial liquidity compression (g₁₁), and orbital angular momentum (g₂₂, g₃₃).
              </p>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-gray-200">
                    Dar-Zeus Wavefunction Collapse (|Ψ(t)|)
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  Phase: {einsteinResult.wavefunctionPhase.toFixed(1)}°
                </span>
              </div>

              <div className="p-4 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Wavefunction Amplitude</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {einsteinResult.wavefunctionAmplitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-[#1E1E24] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, einsteinResult.wavefunctionAmplitude * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>EVM Gas Relativistic Time Dilation</span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {einsteinResult.evmGasDilationFactor.toFixed(3)}x
                    </span>
                  </div>
                  <div className="w-full bg-[#1E1E24] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (einsteinResult.evmGasDilationFactor - 1) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 leading-relaxed pt-1">
                  {einsteinResult.statusMessage}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FOSSIBOT DEVICE MEMORY CARD CLIENT */}
      {/* ========================================================================= */}
      {activeSubTab === "fossibot" && (
        <div className="space-y-6">
          {/* Device Profile Badge */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">
                    {fossibotState.device.model}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    SECURE HARDWARE ENCLAVE
                  </span>
                </div>

                <p className="text-xs text-gray-400">
                  {fossibotState.device.hardwareChipset} • {fossibotState.device.osVersion}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-gray-400">
                  <span>Serial: <strong className="text-gray-200">{fossibotState.device.serialNumber}</strong></span>
                  <span>Mount Path: <strong className="text-emerald-400">{fossibotState.device.mountPath}</strong></span>
                  <span>Battery: <strong className="text-cyan-400">{fossibotState.device.batteryLevelPercent}%</strong></span>
                </div>
              </div>

              {/* Physical Memory Card Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => fossibotMemoryCardClient.toggleMount()}
                  className={`px-5 py-3 rounded-xl font-bold text-sm border shadow-lg transition flex items-center gap-2 ${
                    fossibotState.isMounted
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30"
                      : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  {fossibotState.isMounted ? "Safely Eject Memory Card" : "Mount Fossibot Memory Card"}
                </button>

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to format the Fossibot MicroSD Card? All backups will be cleared.")) {
                      fossibotMemoryCardClient.formatCard();
                    }
                  }}
                  className="px-4 py-3 rounded-xl font-semibold text-xs bg-[#1E1E24] hover:bg-[#25252D] text-gray-400 hover:text-white border border-[#2B2B33] transition"
                >
                  Format Card (exFAT)
                </button>
              </div>
            </div>

            {/* Storage Meter */}
            <div className="mt-6 pt-5 border-t border-[#1F1F23] space-y-2">
              <div className="flex justify-between text-xs text-gray-300 font-mono">
                <span>
                  MicroSD Capacity: <strong>{fossibotState.device.sdCardUsedGB} GB</strong> used of{" "}
                  <strong>{fossibotState.device.sdCardCapacityGB} GB</strong>
                </span>
                <span className="text-emerald-400">
                  {((fossibotState.device.sdCardUsedGB / fossibotState.device.sdCardCapacityGB) * 100).toFixed(1)}% full
                </span>
              </div>
              <div className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(2, (fossibotState.device.sdCardUsedGB / fossibotState.device.sdCardCapacityGB) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Backup Files Browser & Hardware Activity Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Backup Files Browser */}
            <div className="lg:col-span-7 bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-gray-200">
                    MicroSD Card Files ({fossibotState.backups.length} stored)
                  </span>
                </div>
                <button
                  onClick={() => {
                    fossibotMemoryCardClient.saveArtifactToMemoryCard(
                      `ColdKeystore_Taurus_BIP39_${Date.now().toString().slice(-4)}.twkeystore`,
                      "KEYSTORE",
                      JSON.stringify({ seed: bip39SeedPhrase, account: derivedAccount }, null, 2),
                      true
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-semibold flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  Backup Keystore
                </button>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {fossibotState.backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-200 font-bold truncate">{b.filename}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/20 text-blue-400">
                          {b.fileType}
                        </span>
                        {b.encryptedWithPin && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400">
                            PIN PROTECTED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                        <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>Checksum: {b.checksumSha256.slice(0, 16)}...</span>
                        <span>•</span>
                        <span>{new Date(b.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => fossibotMemoryCardClient.downloadBackupFileLocally(b)}
                      className="px-3 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#25252D] text-gray-300 hover:text-white border border-[#2B2B33] text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware Activity Log */}
            <div className="lg:col-span-5 bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-200">Hardware Telemetry Log</span>
                </div>
                <span className="text-[10px] text-gray-500">Live Device Ringbuffer</span>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl font-mono text-[11px] text-gray-300 space-y-1.5 max-h-[380px] overflow-y-auto leading-relaxed">
                {fossibotState.activityLog.map((log, idx) => (
                  <div key={idx} className="border-b border-[#1F1F23]/40 pb-1 last:border-none">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ALL BANKS API AROUND THE WORLD GATEWAY */}
      {/* ========================================================================= */}
      {activeSubTab === "banks" && (
        <div className="space-y-6">
          {/* Bank Wire Router Card */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">
                  All Banks API Around the World Wire Gateway
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                ISO 20022 PACs.008 & FedNow Certified
              </span>
            </div>

            <p className="text-xs text-gray-400">
              Directly routes fiat wires from 32+ global central banks and tier-1 financial institutions into non-custodial
              EVM token liquidity and settles into your MetaMask wallet.
            </p>

            {/* Wire Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Select Global Bank */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Select Originating Bank Rail
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBankId(bId);
                    const rail = GLOBAL_BANK_RAILS.find((r) => r.id === bId);
                    if (rail && rail.supportedCurrencies[0]) {
                      setSourceCurrency(rail.supportedCurrencies[0]);
                    }
                  }}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {GLOBAL_BANK_RAILS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Latency: {GLOBAL_BANK_RAILS.find((b) => b.id === selectedBankId)?.settlementLatency}
                </p>
              </div>

              {/* Wire Amount & Currency */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Wire Amount & Currency
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sourceAmount}
                    onChange={(e) => setSourceAmount(Number(e.target.value))}
                    min={1}
                    className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <select
                    value={sourceCurrency}
                    onChange={(e) => setSourceCurrency(e.target.value)}
                    className="bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {GLOBAL_BANK_RAILS.find((b) => b.id === selectedBankId)?.supportedCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Standard: {GLOBAL_BANK_RAILS.find((b) => b.id === selectedBankId)?.standard}</p>
              </div>

              {/* Target Digital Asset */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Target Non-Custodial Asset
                </label>
                <select
                  value={targetAsset}
                  onChange={(e) => setTargetAsset(e.target.value as any)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="ED-LOGIC">ED-LOGIC (Einstein-Dar Token)</option>
                  <option value="TREE3">TREE3 (Sovereign 10^30 Asset)</option>
                  <option value="ETH">ETH (Native Ethereum)</option>
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="MAOMAO">MAOMAO (Taurus King Token)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">Instant conversion into smart contract liquidity</p>
              </div>

              {/* Recipient MetaMask */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Destination MetaMask Address
                </label>
                <input
                  type="text"
                  value={recipientMetaMask}
                  onChange={(e) => setRecipientMetaMask(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
                />
                <p className="text-[11px] text-gray-500 mt-1">EVM EIP-55 Hex Address</p>
              </div>
            </div>

            {/* Execute Wire Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1F1F23]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecuteBankSettlement}
                  disabled={isProcessingBankWire}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/20 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessingBankWire ? "animate-spin" : ""}`} />
                  {isProcessingBankWire ? "Generating ISO 20022 Wire..." : "Route Bank Settlement to MetaMask"}
                </button>
              </div>

              <div className="text-xs text-gray-400 font-mono">
                Active Banking Rails: <strong className="text-purple-400">{GLOBAL_BANK_RAILS.length} institutions online</strong>
              </div>
            </div>
          </div>

          {/* Settled Bank Wires Ledger */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-200">
                  Global Settlements Ledger ({settledBankTxs.length} executed)
                </span>
              </div>
              <span className="text-[10px] text-gray-500">Real-time ISO 20022 Settlements</span>
            </div>

            {settledBankTxs.length > 0 ? (
              <div className="space-y-3">
                {settledBankTxs.map((tx) => (
                  <div
                    key={tx.uetr}
                    className="p-4 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-400">{tx.bankRail.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-400">
                          {tx.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-300 font-mono pt-1">
                      <div>
                        Wire Amount:{" "}
                        <strong className="text-white">
                          {tx.sourceAmount.toLocaleString()} {tx.sourceCurrency}
                        </strong>
                      </div>
                      <div>
                        Converted Output:{" "}
                        <strong className="text-emerald-400">
                          {tx.targetAssetAmount.toLocaleString()} {tx.targetAsset}
                        </strong>
                      </div>
                      <div>
                        Recipient:{" "}
                        <strong className="text-cyan-400">{tx.recipientAddress.slice(0, 10)}...</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1F1F23]/60 flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span>UETR: {tx.uetr}</span>
                      <span>Tx Hash: {tx.settlementTxHash.slice(0, 20)}...</span>
                      <button
                        onClick={() => copyToClipboard(tx.isoXmlPayloadSnippet, "iso")}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy ISO 20022 XML
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                No bank settlements executed yet. Select a bank and click "Route Bank Settlement".
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: METAMASK PLATFORM ARCHITECTURE & 4-STEP TRANSFER ENGINE */}
      {/* ========================================================================= */}
      {activeSubTab === "metamask_architecture" && (
        <div className="space-y-6">
          {/* ConsenSys Architectural Overview */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">
                  MetaMask Platform Architecture & Self-Custodial Engine
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                ConsenSys Web3 Standard
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              MetaMask is a non-custodial cryptocurrency wallet and Web3 gateway that allows users to manage digital
              assets and interact with dApps across EVM-compatible blockchains. Below is the full implementation of its
              5 architectural pillars and interactive 4-stage transfer lifecycle.
            </p>

            {/* 5 Architectural Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                  <Globe className="w-3.5 h-3.5" />
                  1. Client Interfaces
                </div>
                <p className="text-[11px] text-gray-400">
                  Browser extensions (Chrome, Firefox, Brave, Edge) & Mobile applications (iOS, Android).
                </p>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                  <Activity className="w-3.5 h-3.5" />
                  2. RPC & Node Providers
                </div>
                <p className="text-[11px] text-gray-400">
                  Infura endpoints & custom RPCs (Base, Polygon, BNB Chain, Arbitrum, Optimism, Avalanche).
                </p>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Zap className="w-3.5 h-3.5" />
                  3. Web3 Provider Injection
                </div>
                <p className="text-[11px] text-gray-400">
                  Injects <code className="text-emerald-300">window.ethereum</code> with EIP-1193 standard event listeners.
                </p>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <Key className="w-3.5 h-3.5" />
                  4. Key Cryptography
                </div>
                <p className="text-[11px] text-gray-400">
                  BIP39 12-word seed, BIP44 derivation (m/44'/60'/0'/0/0), local AES-GCM password encryption.
                </p>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  5. Hardware Enclave Bridge
                </div>
                <p className="text-[11px] text-gray-400">
                  Hardware wallet bridge (Ledger, Trezor, Fossibot Rugged MicroSD) to sign offline.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Account & RPC Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Derivation Inspector */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-gray-200">
                    BIP39 / BIP44 Key Management Engine
                  </span>
                </div>
                <button
                  onClick={() => setBip39SeedPhrase(generateBip39Mnemonic(12))}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate New Seed
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] text-gray-400">12-Word Recovery Phrase (Local Client Encryption):</span>
                <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl font-mono text-xs text-amber-300 leading-relaxed">
                  {bip39SeedPhrase}
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Derivation Path:</span>
                  <span className="text-cyan-400">{derivedAccount.derivationPath}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Derived Address:</span>
                  <span className="text-emerald-400 font-bold">{derivedAccount.address}</span>
                </div>
              </div>
            </div>

            {/* RPC & Node Provider Selector */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-200">
                    RPC & Node Provider Integration
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400">Infura & Custom Nodes</span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Target Blockchain Network</label>
                <select
                  value={metaMaskNetwork.chainId}
                  onChange={(e) => {
                    const cId = Number(e.target.value);
                    const net = SUPPORTED_METAMASK_NETWORKS.find((n) => n.chainId === cId);
                    if (net) setMetaMaskNetwork(net);
                  }}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {SUPPORTED_METAMASK_NETWORKS.map((n) => (
                    <option key={n.chainId} value={n.chainId}>
                      {n.name} (Chain ID {n.chainId}) - {n.isDefaultInfura ? "Infura Default" : "Custom RPC"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl font-mono text-xs space-y-1 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">RPC Endpoint:</span>
                  <span className="text-cyan-400 truncate max-w-[220px]">{metaMaskNetwork.rpcUrls[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Block:</span>
                  <span className="text-emerald-400">#{metaMaskNetwork.currentBlockNumber.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Node Latency:</span>
                  <span className="text-amber-400">{metaMaskNetwork.latencyMs} ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Step Self-Custodial Transfer Flow Wizard */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  4-Step Self-Custodial Transfer Lifecycle
                </h3>
                <p className="text-xs text-gray-400">
                  Interactive simulation of how transfers construct, calculate gas fees, sign offline, and broadcast
                </p>
              </div>

              {/* Step Badges */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setMetaMaskSubStep(step as any)}
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition ${
                      metaMaskSubStep === step
                        ? "bg-[#F27D26] text-white shadow"
                        : metaMaskSubStep > step
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-[#1E1E24] text-gray-500"
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>

            {/* STAGE 1: TRANSACTION CONSTRUCTION */}
            {metaMaskSubStep === 1 && (
              <div className="p-4 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                  <Terminal className="w-4 h-4" />
                  Stage 1: Transaction Construction
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Destination Address (to)</label>
                    <input
                      type="text"
                      value={txRecipient}
                      onChange={(e) => setTxRecipient(e.target.value)}
                      className="w-full bg-[#16161A] border border-[#2B2B33] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Asset Type</label>
                    <select
                      value={txAssetType}
                      onChange={(e) => setTxAssetType(e.target.value as any)}
                      className="w-full bg-[#16161A] border border-[#2B2B33] rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="NATIVE_ETH">Native ETH Transfer</option>
                      <option value="ERC-20_TOKEN">ERC-20 Token Transfer (ED-LOGIC / TREE3)</option>
                      <option value="CONTRACT_INTERACTION">Smart Contract Interaction (Calldata)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Amount</label>
                    <input
                      type="text"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full bg-[#16161A] border border-[#2B2B33] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleConstructTx}
                    className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    Proceed to Gas & Fee Estimation
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2: GAS & FEE ESTIMATION (EIP-1559) */}
            {metaMaskSubStep === 2 && gasEstimation && constructedTx && (
              <div className="p-4 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <Activity className="w-4 h-4" />
                    Stage 2: Gas & Fee Estimation (EIP-1559 Standard)
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">
                    Network: {metaMaskNetwork.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#16161A] border border-[#1F1F23] rounded-lg space-y-1">
                    <span className="text-[11px] text-gray-500">Base Fee (Dynamic Mempool)</span>
                    <div className="text-base font-bold text-cyan-300 font-mono">
                      {gasEstimation.baseFeeGwei} Gwei
                    </div>
                  </div>

                  <div className="p-3 bg-[#16161A] border border-[#1F1F23] rounded-lg space-y-1">
                    <span className="text-[11px] text-gray-500">Priority Fee (Miner Tip)</span>
                    <div className="text-base font-bold text-amber-300 font-mono">
                      {gasEstimation.priorityFeeGwei} Gwei
                    </div>
                  </div>

                  <div className="p-3 bg-[#16161A] border border-[#1F1F23] rounded-lg space-y-1">
                    <span className="text-[11px] text-gray-500">Max Fee Cap</span>
                    <div className="text-base font-bold text-orange-400 font-mono">
                      {gasEstimation.maxFeeGwei} Gwei
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setMetaMaskSubStep(1)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    ← Back to Construction
                  </button>
                  <button
                    onClick={handleConfirmGas}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    Approve Gas & Proceed to Offline Signing
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: OFFLINE CRYPTOGRAPHIC SIGNING */}
            {metaMaskSubStep === 3 && constructedTx && gasEstimation && (
              <div className="p-4 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Shield className="w-4 h-4" />
                  Stage 3: Offline Cryptographic Signing (ECDSA secp256k1)
                </div>

                <p className="text-xs text-gray-400">
                  The transaction payload is signed offline using the derived private key via ECDSA on the secp256k1 elliptic curve.
                  No private keys are transmitted to external servers.
                </p>

                <div className="p-3 bg-[#16161A] border border-[#1F1F23] rounded-lg space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Signer Account:</span>
                    <span className="text-emerald-400">{derivedAccount.address}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Raw Payload Calldata:</span>
                    <span className="text-amber-300 truncate max-w-[260px]">{constructedTx.data}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setMetaMaskSubStep(2)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    ← Back to Gas
                  </button>
                  <button
                    onClick={handleSignTransaction}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Sign Offline with Private Key
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 4: BROADCASTING & SETTLEMENT */}
            {metaMaskSubStep === 4 && signedTxPayload && (
              <div className="p-4 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Zap className="w-4 h-4" />
                    Stage 4: JSON-RPC Broadcasting & Settlement (eth_sendRawTransaction)
                  </div>
                  <span className="text-[10px] font-mono text-green-400">
                    Offline Signature: Verified
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-gray-400 font-mono">Serialized Signed Raw Transaction (RLP Hex):</span>
                  <div className="p-3 bg-[#16161A] border border-[#1F1F23] rounded-lg font-mono text-xs text-amber-300 break-all select-all max-h-[90px] overflow-y-auto">
                    {signedTxPayload.rawTransactionHex}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-gray-400">
                  <div>Signature r: <span className="text-gray-300">{signedTxPayload.signature.r.slice(0, 14)}...</span></div>
                  <div>Signature s: <span className="text-gray-300">{signedTxPayload.signature.s.slice(0, 14)}...</span></div>
                  <div>Recovery v: <span className="text-emerald-400">{signedTxPayload.signature.v}</span></div>
                </div>

                {/* Broadcast Action or Finality Receipt */}
                {!broadcastResult ? (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setMetaMaskSubStep(3)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      ← Back to Signature
                    </button>
                    <button
                      onClick={handleBroadcastTransaction}
                      disabled={isBroadcasting}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isBroadcasting ? "animate-spin" : ""}`} />
                      {isBroadcasting ? "Broadcasting to Mempool..." : "Broadcast to Node via JSON-RPC"}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Transaction Finalized on Block #{broadcastResult.blockNumber.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {broadcastResult.confirmations} Confirmations
                      </span>
                    </div>

                    <div className="font-mono text-xs text-gray-300 pt-1">
                      Tx Hash: <span className="text-cyan-400 select-all">{broadcastResult.txHash}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <a
                        href={broadcastResult.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on Block Explorer
                      </a>
                      <button
                        onClick={() => {
                          setBroadcastResult(null);
                          setMetaMaskSubStep(1);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        Reset Transfer Flow
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 5-LAYER CRYPTO / WEB3 FULL-STACK ARCHITECTURE */}
      {/* ========================================================================= */}
      {activeSubTab === "web3_architecture" && (
        <Web3FullStackArchitectureCockpit
          onOpenSolidityCompiler={() => setActiveSubTab("compiler")}
          onOpenMetaMaskTransferModal={onOpenMetaMaskTransferModal}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 8: CRYPTOGRAPHIC KEY MANAGEMENT & SECURE ENCLAVES (WEB3 SIGNING BRIDGE) */}
      {/* ========================================================================= */}
      {activeSubTab === "key_enclaves" && (
        <CryptographicKeyEnclaveSigningBridge
          onNavigateToTab={(tab) => {
            if (tab === "compiler") setActiveSubTab("compiler");
            else if (tab === "web3_architecture") setActiveSubTab("web3_architecture");
          }}
          onOpenUniversalWallet={() => {
            if (onOpenMetaMaskTransferModal) onOpenMetaMaskTransferModal("send");
          }}
        />
      )}
    </div>
  );
};
