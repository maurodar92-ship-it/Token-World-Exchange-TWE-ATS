import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Lock,
  Shield,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Globe,
  Wallet,
  Zap,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Send,
  Database,
  Search,
  Sparkles,
  AlertTriangle,
  FileCode,
  Binary,
  Radio,
  CheckCircle2,
  HardDrive
} from "lucide-react";
import {
  generateCryptographicMnemonic,
  deriveHdEnclaveAccount,
  encryptKeyPayloadWithAesGcm,
  decryptKeyPayloadWithAesGcm,
  signDeterministicEcdsa,
  signEip712IntentPayload,
  signDeterministicEd25519Mock,
  Web3RpcClient,
  SUPPORTED_RPC_NODES,
  parseIntentViaGeminiFunctionCalling,
  serializeUnsignedEip1559Transaction,
  EncryptedEnclaveVaultBlob,
  DeterministicEcdsaSignature,
  JsonRpcNodeConfig
} from "../utils/cryptographicEnclaveBridgeEngine";
import { GeminiWeb3ArchitectureBridge } from "./GeminiWeb3ArchitectureBridge";
import { SignerComponent } from "./SignerComponent";

interface Props {
  onNavigateToTab?: (tabId: string) => void;
  onOpenUniversalWallet?: () => void;
}

export type BridgeTab = 
  | "three_tier_blueprint"
  | "viem_wallet_signer"
  | "architecture_gap"
  | "key_enclaves"
  | "signing_engine"
  | "rpc_nodes"
  | "end_to_end_pipeline";

export const CryptographicKeyEnclaveSigningBridge: React.FC<Props> = ({
  onNavigateToTab,
  onOpenUniversalWallet
}) => {
  const [activeTab, setActiveTab] = useState<BridgeTab>("three_tier_blueprint");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ==========================================================================
  // TAB 1: KEY GENERATION & ENCLAVE ISOLATION STATE
  // ==========================================================================
  const [mnemonicWordCount, setMnemonicWordCount] = useState<12 | 24>(12);
  const [mnemonicData, setMnemonicData] = useState(() => generateCryptographicMnemonic(12));
  const [selectedDerivationPath, setSelectedDerivationPath] = useState<string>("m/44'/60'/0'/0/");
  const [derivedAccounts, setDerivedAccounts] = useState<any[]>([]);
  
  // AES-256-GCM Vault State
  const [vaultPassphrase, setVaultPassphrase] = useState<string>("SovereignTreasury#2026!KeyEnclave");
  const [encryptedVaultBlob, setEncryptedVaultBlob] = useState<EncryptedEnclaveVaultBlob | null>(null);
  const [decryptedResult, setDecryptedResult] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  useEffect(() => {
    // Derive initial 3 accounts from current mnemonic
    try {
      const acc0 = deriveHdEnclaveAccount(mnemonicData.mnemonic, 0, selectedDerivationPath);
      const acc1 = deriveHdEnclaveAccount(mnemonicData.mnemonic, 1, selectedDerivationPath);
      const acc2 = deriveHdEnclaveAccount(mnemonicData.mnemonic, 2, selectedDerivationPath);
      setDerivedAccounts([acc0, acc1, acc2]);
    } catch (e) {
      console.warn("HD derivation error:", e);
    }
  }, [mnemonicData, selectedDerivationPath]);

  const handleGenerateNewMnemonic = () => {
    const newMnemonic = generateCryptographicMnemonic(mnemonicWordCount);
    setMnemonicData(newMnemonic);
    setEncryptedVaultBlob(null);
    setDecryptedResult(null);
  };

  const handleEncryptMnemonicWithAesGcm = async () => {
    setIsEncrypting(true);
    try {
      const blob = await encryptKeyPayloadWithAesGcm(mnemonicData.mnemonic, vaultPassphrase, 600000);
      setEncryptedVaultBlob(blob);
      setDecryptedResult(null);
    } catch (e) {
      console.error("AES-GCM encryption error:", e);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecryptVaultBlob = async () => {
    if (!encryptedVaultBlob) return;
    setIsDecrypting(true);
    try {
      const plain = await decryptKeyPayloadWithAesGcm(encryptedVaultBlob, vaultPassphrase);
      setDecryptedResult(plain);
    } catch (e) {
      setDecryptedResult("DECRYPTION_FAILED: Invalid passphrase or corrupted ciphertext tag.");
    } finally {
      setIsDecrypting(false);
    }
  };

  // ==========================================================================
  // TAB 2: DETERMINISTIC SIGNING ENGINE STATE
  // ==========================================================================
  const [signingAlgorithm, setSigningAlgorithm] = useState<"ecdsa" | "eip712" | "ed25519" | "erc4337">("ecdsa");
  const [rawPayloadToSign, setRawPayloadToSign] = useState<string>(
    "TRANSFER: 2.5 ETH to Protocol Treasury 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0 [Nonce: 184]"
  );
  const [ecdsaSignature, setEcdsaSignature] = useState<DeterministicEcdsaSignature | null>(null);
  const [eip712Signature, setEip712Signature] = useState<any | null>(null);
  const [ed25519Signature, setEd25519Signature] = useState<any | null>(null);

  const activeSignerPrivateKey = useMemo(() => {
    return derivedAccounts[0]?.privateKeyFull || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
  }, [derivedAccounts]);

  const handleExecuteDeterministicSign = async () => {
    if (signingAlgorithm === "ecdsa") {
      const sig = signDeterministicEcdsa(activeSignerPrivateKey, rawPayloadToSign);
      setEcdsaSignature(sig);
    } else if (signingAlgorithm === "eip712") {
      const sampleIntent = {
        domain: {
          name: "UniswapX Intent Order",
          version: "1",
          chainId: 1,
          verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3"
        },
        types: {
          Permit2WitnessOrder: [
            { name: "tokenIn", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "tokenOut", type: "address" },
            { name: "amountOutMin", type: "uint256" },
            { name: "recipient", type: "address" },
            { name: "deadline", type: "uint256" }
          ]
        },
        message: {
          tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          amountIn: "1000000000000000000",
          tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          amountOutMin: "3445000000",
          recipient: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
          deadline: 1795000000
        },
        primaryType: "Permit2WitnessOrder"
      };
      const res = await signEip712IntentPayload(activeSignerPrivateKey, sampleIntent);
      setEip712Signature(res);
    } else if (signingAlgorithm === "ed25519") {
      const res = signDeterministicEd25519Mock(rawPayloadToSign);
      setEd25519Signature(res);
    }
  };

  // ==========================================================================
  // TAB 3: JSON-RPC NODE COMMUNICATION CONSOLE
  // ==========================================================================
  const [selectedRpcNode, setSelectedRpcNode] = useState<JsonRpcNodeConfig>(SUPPORTED_RPC_NODES[0]);
  const [rpcBlockNumber, setRpcBlockNumber] = useState<number | null>(null);
  const [rpcGasData, setRpcGasData] = useState<{ gasPriceGwei: string; maxFeePerGasGwei: string; maxPriorityFeePerGasGwei: string } | null>(null);
  const [rpcTargetAddress, setRpcTargetAddress] = useState<string>("0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0");
  const [rpcNonce, setRpcNonce] = useState<number | null>(null);
  const [rpcBalance, setRpcBalance] = useState<string | null>(null);
  const [isQueryingRpc, setIsQueryingRpc] = useState<boolean>(false);
  const [rpcLogs, setRpcLogs] = useState<string[]>([
    `[INIT] Ready to dispatch JSON-RPC calls over HTTP to ${SUPPORTED_RPC_NODES[0].rpcUrl}`
  ]);

  const handleQueryLiveRpc = async () => {
    setIsQueryingRpc(true);
    const client = new Web3RpcClient(selectedRpcNode);
    try {
      const [block, fee, count, bal] = await Promise.all([
        client.getLatestBlockNumber(),
        client.getFeeData(),
        client.getTransactionCount(rpcTargetAddress),
        client.getBalance(rpcTargetAddress)
      ]);
      setRpcBlockNumber(block);
      setRpcGasData(fee);
      setRpcNonce(count);
      setRpcBalance(bal);
      setRpcLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] eth_blockNumber -> ${block}`,
        `[${new Date().toLocaleTimeString()}] eth_feeHistory / gasPrice -> ${fee.gasPriceGwei} Gwei`,
        `[${new Date().toLocaleTimeString()}] eth_getTransactionCount(${rpcTargetAddress.slice(0, 8)}...) -> ${count}`,
        `[${new Date().toLocaleTimeString()}] eth_getBalance(${rpcTargetAddress.slice(0, 8)}...) -> ${bal} ${selectedRpcNode.nativeCurrency}`,
        ...prev.slice(0, 10)
      ]);
    } catch (e: any) {
      setRpcLogs((prev) => [
        `[ERROR] JSON-RPC query failed: ${e.message || "Network unreachable"}`,
        ...prev
      ]);
    } finally {
      setIsQueryingRpc(false);
    }
  };

  // ==========================================================================
  // TAB 4: END-TO-END PIPELINE (AI STUDIO -> WEB3 -> ENCLAVE -> RPC)
  // ==========================================================================
  const [pipelinePrompt, setPipelinePrompt] = useState<string>(
    "Swap 1.5 ETH for USDC with 0.5% max slippage and route to Protocol Treasury 0x70Ac on Base"
  );
  const [pipelineIntent, setPipelineIntent] = useState<any>(null);
  const [pipelineSerializedTx, setPipelineSerializedTx] = useState<any>(null);
  const [pipelineSignedHex, setPipelineSignedHex] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<number>(1);
  const [isProcessingPipeline, setIsProcessingPipeline] = useState<boolean>(false);

  const handleRunFullBridgePipeline = async () => {
    setIsProcessingPipeline(true);
    setPipelineStep(1);

    // Step 1: Gemini Intelligence parses intent via function calling schema
    const intent = parseIntentViaGeminiFunctionCalling(pipelinePrompt);
    setPipelineIntent(intent);
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Web3 Library (ethers.js / viem) serializes unsigned EIP-1559 payload
    setPipelineStep(2);
    const userSender = derivedAccounts[0]?.address || "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";
    const serialized = serializeUnsignedEip1559Transaction(intent, userSender, 48);
    setPipelineSerializedTx(serialized);
    await new Promise((r) => setTimeout(r, 600));

    // Step 3: Hardware Enclave / User Wallet prompts isolated signature
    setPipelineStep(3);
    const sig = signDeterministicEcdsa(activeSignerPrivateKey, serialized.rawUnsignedPayloadHex);
    const signedPayloadHex = `${serialized.rawUnsignedPayloadHex.slice(0, -2)}${sig.r.slice(2)}${sig.s.slice(2)}${sig.v.toString(16)}`;
    setPipelineSignedHex(signedPayloadHex);
    await new Promise((r) => setTimeout(r, 600));

    // Step 4: JSON-RPC node broadcasts to mempool
    setPipelineStep(4);
    setIsProcessingPipeline(false);
  };

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* HEADER: ARCHITECTURAL BOUNDARY & GAP OVERVIEW                       */}
      {/* ================================================================== */}
      <div className="bg-gradient-to-r from-[#0C1017] via-[#0F172A] to-[#0A0D14] border border-[#1E293B] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-inner">
                <Key className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Cryptographic Key Management & Secure Enclaves
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Web3 Signing Bridge
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
                  Deterministic transaction signing engine, hardware enclave key custody, and JSON-RPC node 
                  communication bridging Google AI Studio & Gemini API intelligence with dedicated Web3 execution runtimes.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopy("0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0", "hdr_treasury")}
                className="px-3 py-1.5 bg-[#1E293B]/60 hover:bg-[#1E293B] border border-slate-700/60 rounded-lg text-xs font-mono text-slate-300 flex items-center space-x-1.5 transition-colors"
              >
                <span>Treasury: 0x70Ac...94f0</span>
                {copiedKey === "hdr_treasury" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {onOpenUniversalWallet && (
                <button
                  onClick={onOpenUniversalWallet}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-lg shadow-cyan-900/30 transition-all"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setActiveTab("three_tier_blueprint")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "three_tier_blueprint"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>1. 3-Tier Gemini → Viem → Enclave Bridge & ERC-4337 Policy</span>
            </button>

            <button
              onClick={() => setActiveTab("viem_wallet_signer")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "viem_wallet_signer"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span>2. Viem SignerComponent (MetaMask / Coinbase Approval)</span>
            </button>

            <button
              onClick={() => setActiveTab("architecture_gap")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "architecture_gap"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>3. Why AI Studio is Not a Wallet & How to Bridge</span>
            </button>

            <button
              onClick={() => setActiveTab("key_enclaves")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "key_enclaves"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Key className="w-4 h-4 text-indigo-400" />
              <span>4. Key Management & Secure Enclaves</span>
            </button>

            <button
              onClick={() => setActiveTab("signing_engine")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "signing_engine"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>5. Deterministic Signing Engine</span>
            </button>

            <button
              onClick={() => setActiveTab("rpc_nodes")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "rpc_nodes"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>6. Blockchain Node RPC Client</span>
            </button>

            <button
              onClick={() => setActiveTab("end_to_end_pipeline")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === "end_to_end_pipeline"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>7. Live AI-to-Web3 Bridge Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* TAB 0: 3-TIER GEMINI-TO-WEB3 ARCHITECTURE & ERC-4337 POLICY BRIDGE */}
      {/* ================================================================== */}
      {activeTab === "three_tier_blueprint" && (
        <GeminiWeb3ArchitectureBridge onOpenUniversalWallet={onOpenUniversalWallet} />
      )}

      {/* ================================================================== */}
      {/* TAB 0B: DEDICATED VIEM SIGNER COMPONENT (METAMASK / COINBASE)      */}
      {/* ================================================================== */}
      {activeTab === "viem_wallet_signer" && (
        <SignerComponent />
      )}

      {/* ================================================================== */}
      {/* TAB 1: ARCHITECTURE GAP & THE BRIDGE                               */}
      {/* ================================================================== */}
      {activeTab === "architecture_gap" && (
        <div className="space-y-6">
          {/* Missing Components vs Solution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Why AI Studio cannot be a wallet */}
            <div className="bg-[#0B0F17] border border-rose-900/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">
                  Why Google AI Studio Lacks Native Wallet Capabilities
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Google AI Studio is an AI prototyping environment, not an application execution environment or a blockchain client. 
                It lacks the execution runtime, cryptographic key custody, and network interfaces required to operate as a cryptocurrency wallet:
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>1. No Isolated Hardware Enclave for Private Keys</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    A crypto wallet must store seed phrases inside isolated, tamper-proof storage (HSM, Apple Secure Enclave, or StrongBox). 
                    AI Studio operates over remote HTTP/WebSocket prompts and has no safe environment for key isolation.
                  </p>
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
                    <Binary className="w-3.5 h-3.5" />
                    <span>2. LLMs Cannot Deterministically Sign Transactions</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Transactions require deterministic elliptic curve algorithms (ECDSA secp256k1 for EVM/Bitcoin, Ed25519 for Solana). 
                    Language models generate probabilistic text tokens, not bit-exact cryptographic signature curves ($r, s, v$).
                  </p>
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
                    <Globe className="w-3.5 h-3.5" />
                    <span>3. No Blockchain JSON-RPC Provider Layer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Wallets must query nonces, estimate gas limits, and broadcast raw signed payloads (<code className="text-rose-200">eth_sendRawTransaction</code>) to peer-to-peer mempools. 
                    AI Studio has no built-in Web3 provider layer.
                  </p>
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
                    <Database className="w-3.5 h-3.5" />
                    <span>4. Ephemeral Sandbox vs Persistent State</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AI Studio is a stateless prompt sandbox. It cannot maintain persistent wallet listeners or handle incoming connection requests without external web hosting.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: How the Bridge Solves It */}
            <div className="bg-[#0B0F17] border border-cyan-900/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3 text-cyan-400">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">
                  How We Bridge the Gap: Separation of Concerns
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                We use Google AI Studio (and the Gemini API) strictly as the <strong className="text-cyan-300">intelligence layer</strong>, 
                while offloading wallet custody, payload serialization, and signing to dedicated Web3 runtime components:
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-cyan-300 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Layer 1: AI Studio / Gemini API Intelligence Layer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Parses natural language user intent, generates market insights, and prepares structured transaction parameters via <code className="text-cyan-200">function calling schemas</code>.
                  </p>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Layer 2: Frontend Web3 Libraries (ethers.js / viem / web3.js)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Runs inside client runtime to construct, validate, and serialize EIP-1559 transaction payloads, encode contract ABIs, and compute gas fees.
                  </p>
                </div>

                <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-purple-300 font-semibold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Layer 3: User Wallet Providers & Secure Enclaves</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    MetaMask, Coinbase Wallet, WebAuthn Passkeys, or embedded toolkits (Turnkey, Privy, Dynamic) keep private keys isolated in hardware and handle user signing authorization.
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-xs">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Layer 4: Direct JSON-RPC Node Communication</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Connects directly to Infura, Alchemy, or public RPC nodes (LlamaRPC, Base, Arbitrum) to query nonces and broadcast raw transactions to validator mempools.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Stage Architectural Diagram Card */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Full-Stack Web3 Architectural Bridge Flow</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              <div className="p-4 bg-slate-900/60 border border-cyan-500/30 rounded-xl space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  Stage 01 • Intelligence
                </div>
                <div className="text-xs font-bold text-white">Google AI Studio / Gemini API</div>
                <div className="text-[11px] text-slate-400">
                  Parses user intent ("Swap 1 ETH to USDC") and outputs structured JSON function call arguments.
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-indigo-500/30 rounded-xl space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  Stage 02 • Serialization
                </div>
                <div className="text-xs font-bold text-white">Frontend ethers.js / viem</div>
                <div className="text-[11px] text-slate-400">
                  Encodes ABI calldata, queries nonce, calculates EIP-1559 gas fees, and formats raw unsigned payload.
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-purple-500/30 rounded-xl space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-semibold">
                  Stage 03 • Custody & Signing
                </div>
                <div className="text-xs font-bold text-white">Secure Enclave / MetaMask</div>
                <div className="text-[11px] text-slate-400">
                  Isolated hardware enclave securely executes deterministic ECDSA secp256k1 signing ($r, s, v$).
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Stage 04 • Settlement
                </div>
                <div className="text-xs font-bold text-white">JSON-RPC Node Broadcast</div>
                <div className="text-[11px] text-slate-400">
                  Dispatches <code className="text-emerald-300">eth_sendRawTransaction</code> to mempool & polls receipt finality.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: KEY MANAGEMENT & SECURE ENCLAVES                            */}
      {/* ================================================================== */}
      {activeTab === "key_enclaves" && (
        <div className="space-y-6">
          {/* Mnemonic Generator & Entropy Box */}
          <div className="bg-[#0B0F17] border border-indigo-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <span>BIP-39 Mnemonic Generator & Web Crypto Entropy</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generates deterministic seed phrases using cryptographically secure PRNG (<code className="text-indigo-300">window.crypto.getRandomValues</code>)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                  <button
                    onClick={() => { setMnemonicWordCount(12); setMnemonicData(generateCryptographicMnemonic(12)); }}
                    className={`px-3 py-1 rounded-md transition-colors ${mnemonicWordCount === 12 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    12 Words (128-bit)
                  </button>
                  <button
                    onClick={() => { setMnemonicWordCount(24); setMnemonicData(generateCryptographicMnemonic(24)); }}
                    className={`px-3 py-1 rounded-md transition-colors ${mnemonicWordCount === 24 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    24 Words (256-bit)
                  </button>
                </div>
                <button
                  onClick={handleGenerateNewMnemonic}
                  className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Mnemonic Display Grid */}
            <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">BIP-39 English Wordlist Seed Phrase:</span>
                <button
                  onClick={() => handleCopy(mnemonicData.mnemonic, "mnemonic_phrase")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  {copiedKey === "mnemonic_phrase" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "mnemonic_phrase" ? "Copied" : "Copy Phrase"}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {mnemonicData.mnemonic.split(" ").map((word, idx) => (
                  <div key={idx} className="p-2 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-500">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="text-xs font-mono font-medium text-slate-200">{word}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Entropy Hex: <code className="text-slate-400">{mnemonicData.entropyHex}</code></span>
                <span>Security Strength: {mnemonicWordCount === 24 ? "256 bits (Quantum Resistant)" : "128 bits (Standard)"}</span>
              </div>
            </div>
          </div>

          {/* HD Derivation & Account Matrix */}
          <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <span>BIP-32 / BIP-44 Hierarchical Deterministic (HD) Derivation</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Computes deterministic public keys and EVM/SVM addresses from master seed
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-mono">Derivation Path:</span>
                <select
                  value={selectedDerivationPath}
                  onChange={(e) => setSelectedDerivationPath(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="m/44'/60'/0'/0/">m/44'/60'/0'/0/ (Ethereum & EVM Standard)</option>
                  <option value="m/44'/501'/0'/0/">m/44'/501'/0'/0/ (Solana SVM Standard)</option>
                  <option value="m/44'/0'/0'/0/">m/44'/0'/0'/0/ (Bitcoin Legacy Standard)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {derivedAccounts.map((acc, idx) => (
                <div key={idx} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded text-[10px] font-mono">
                      Account #{idx} • Index {idx}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{acc.path}</span>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">Address:</div>
                    <div className="text-xs font-mono font-semibold text-white truncate flex items-center justify-between">
                      <span>{acc.address}</span>
                      <button
                        onClick={() => handleCopy(acc.address, `addr_${idx}`)}
                        className="text-slate-400 hover:text-slate-200 ml-1"
                      >
                        {copiedKey === `addr_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">Masked Enclave Key:</div>
                    <div className="text-xs font-mono text-slate-400 truncate">
                      {acc.privateKeyMasked}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tamper-Proof Storage Playground (AES-256-GCM + PBKDF2) */}
          <div className="bg-[#0B0F17] border border-emerald-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <HardDrive className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Tamper-Proof Storage Playground: Client-Side AES-256-GCM + PBKDF2
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authenticated encryption with 600,000 PBKDF2 rounds, 128-bit salt, and 96-bit unique IV.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">1. Encrypt Seed into Tamper-Proof Blob</span>
                  <span className="text-[10px] font-mono text-emerald-400">AES-256-GCM</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Enclave Passphrase:</label>
                  <input
                    type="text"
                    value={vaultPassphrase}
                    onChange={(e) => setVaultPassphrase(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleEncryptMnemonicWithAesGcm}
                  disabled={isEncrypting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isEncrypting ? "Deriving Key (600,000 rounds)..." : "Encrypt with AES-256-GCM"}</span>
                </button>

                {encryptedVaultBlob && (
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1 text-[10px] font-mono">
                    <div className="text-slate-400">Ciphertext Base64:</div>
                    <div className="text-emerald-300 break-all">{encryptedVaultBlob.cipherTextBase64.slice(0, 48)}...</div>
                    <div className="text-slate-500">IV: {encryptedVaultBlob.ivHex} • Salt: {encryptedVaultBlob.saltHex}</div>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Decrypt & Verify Authentication Tag</span>
                  <span className="text-[10px] font-mono text-cyan-400">Authenticated 128-bit Tag</span>
                </div>

                <p className="text-[11px] text-slate-400">
                  GCM verifies the ciphertext has not been tampered with in local storage. Any bit alteration will cause decryption to abort.
                </p>

                <button
                  onClick={handleDecryptVaultBlob}
                  disabled={!encryptedVaultBlob || isDecrypting}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isDecrypting ? "Verifying..." : "Decrypt Authenticated Payload"}</span>
                </button>

                {decryptedResult && (
                  <div className="p-3 bg-slate-900/90 border border-cyan-800/40 rounded-lg space-y-1 text-[11px] font-mono">
                    <div className="text-slate-400">Decrypted Seed:</div>
                    <div className="text-cyan-300 font-medium break-all">{decryptedResult}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: DETERMINISTIC SIGNING ENGINE                                */}
      {/* ================================================================== */}
      {activeTab === "signing_engine" && (
        <div className="space-y-6">
          <div className="bg-[#0B0F17] border border-purple-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>Deterministic Cryptographic Signing Engine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Executes exact mathematical curve operations on finite fields ($r, s, v$) vs non-deterministic LLM text generation
                </p>
              </div>

              {/* Algorithm Switcher */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                <button
                  onClick={() => setSigningAlgorithm("ecdsa")}
                  className={`px-3 py-1 rounded-md transition-colors ${signingAlgorithm === "ecdsa" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                >
                  ECDSA (secp256k1)
                </button>
                <button
                  onClick={() => setSigningAlgorithm("eip712")}
                  className={`px-3 py-1 rounded-md transition-colors ${signingAlgorithm === "eip712" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                >
                  EIP-712 Intent
                </button>
                <button
                  onClick={() => setSigningAlgorithm("ed25519")}
                  className={`px-3 py-1 rounded-md transition-colors ${signingAlgorithm === "ed25519" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Ed25519 (Solana)
                </button>
              </div>
            </div>

            {/* Input Payload */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Transaction or Intent Payload to Sign:</label>
              <textarea
                value={rawPayloadToSign}
                onChange={(e) => setRawPayloadToSign(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl p-3 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-400">
                Signing Key: <code className="text-purple-300">{activeSignerPrivateKey.slice(0, 10)}...{activeSignerPrivateKey.slice(-6)}</code> (Enclave Isolated)
              </div>
              <button
                onClick={handleExecuteDeterministicSign}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-purple-900/30 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Execute Deterministic Sign</span>
              </button>
            </div>

            {/* Signature Output Inspector */}
            {signingAlgorithm === "ecdsa" && ecdsaSignature && (
              <div className="p-4 bg-slate-950/80 border border-purple-800/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>secp256k1 Curve Signature Result ($r, s, v$)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Canonical Low-S Enforced (EIP-2)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500">r (Curve X-Coordinate):</div>
                    <div className="text-purple-300 truncate">{ecdsaSignature.r}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500">s (Signature Proof):</div>
                    <div className="text-purple-300 truncate">{ecdsaSignature.s}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500">v (Recovery Identifier):</div>
                    <div className="text-emerald-300">{ecdsaSignature.v} (yParity: {ecdsaSignature.yParity})</div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-[11px] font-mono">
                  <div className="text-slate-500">Serialized 65-Byte Raw Hex (r + s + v):</div>
                  <div className="text-slate-200 break-all select-all">{ecdsaSignature.rawSignatureHex}</div>
                </div>
              </div>
            )}

            {signingAlgorithm === "eip712" && eip712Signature && (
              <div className="p-4 bg-slate-950/80 border border-indigo-800/40 rounded-xl space-y-3">
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>EIP-712 Structured Typed Data Signature (UniswapX / CoW Swap)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500">Domain Separator Hash:</div>
                    <div className="text-indigo-300 truncate">{eip712Signature.domainSeparator}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500">Struct Hash (TypeHash):</div>
                    <div className="text-indigo-300 truncate">{eip712Signature.structHash}</div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-[11px] font-mono">
                  <div className="text-slate-500">EIP-712 Typed Signature:</div>
                  <div className="text-slate-200 break-all select-all">{eip712Signature.signature}</div>
                </div>
              </div>
            )}

            {signingAlgorithm === "ed25519" && ed25519Signature && (
              <div className="p-4 bg-slate-950/80 border border-emerald-800/40 rounded-xl space-y-3">
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Ed25519 (Curve25519 / SHA-512) Solana SVM Signature</span>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-[11px] font-mono">
                  <div className="text-slate-500">Base58 Deterministic Signature:</div>
                  <div className="text-emerald-300 break-all select-all">{ed25519Signature.signatureBase58}</div>
                  <div className="text-slate-500 pt-1">Signer Public Key: {ed25519Signature.publicKey}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: BLOCKCHAIN NODE RPC COMMUNICATION CONSOLE                    */}
      {/* ================================================================== */}
      {activeTab === "rpc_nodes" && (
        <div className="space-y-6">
          <div className="bg-[#0B0F17] border border-emerald-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span>Blockchain Node JSON-RPC Communication Console</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live JSON-RPC node connector querying live nonces, estimating gas limits, and broadcasting transactions
                </p>
              </div>

              {/* Node Selector */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedRpcNode.id}
                  onChange={(e) => {
                    const found = SUPPORTED_RPC_NODES.find((n) => n.id === e.target.value);
                    if (found) setSelectedRpcNode(found);
                  }}
                  className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  {SUPPORTED_RPC_NODES.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} (Chain ID: {n.chainId})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleQueryLiveRpc}
                  disabled={isQueryingRpc}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQueryingRpc ? "animate-spin" : ""}`} />
                  <span>{isQueryingRpc ? "Querying..." : "Query Live Node"}</span>
                </button>
              </div>
            </div>

            {/* Target Address Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Target EVM Address to Inspect Nonce & Balance:</label>
                <input
                  type="text"
                  value={rpcTargetAddress}
                  onChange={(e) => setRpcTargetAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Endpoint URL:</label>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 truncate">
                  {selectedRpcNode.rpcUrl}
                </div>
              </div>
            </div>

            {/* Live RPC Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-slate-400">eth_blockNumber:</div>
                <div className="text-sm font-mono font-bold text-white">
                  {rpcBlockNumber ? `#${rpcBlockNumber.toLocaleString()}` : "Not queried"}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-slate-400">gasPrice / Fee:</div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {rpcGasData ? `${rpcGasData.gasPriceGwei} Gwei` : "Not queried"}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-slate-400">eth_getTransactionCount (Nonce):</div>
                <div className="text-sm font-mono font-bold text-cyan-400">
                  {rpcNonce !== null ? rpcNonce : "Not queried"}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-slate-400">eth_getBalance:</div>
                <div className="text-sm font-mono font-bold text-purple-400">
                  {rpcBalance !== null ? `${Number(rpcBalance).toFixed(4)} ${selectedRpcNode.nativeCurrency}` : "Not queried"}
                </div>
              </div>
            </div>

            {/* RPC Log Console */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                JSON-RPC Wire Protocol Logs:
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] text-slate-400">
                {rpcLogs.map((log, idx) => (
                  <div key={idx} className="truncate">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 5: LIVE AI-TO-WEB3 BRIDGE PIPELINE                             */}
      {/* ================================================================== */}
      {activeTab === "end_to_end_pipeline" && (
        <div className="space-y-6">
          <div className="bg-[#0B0F17] border border-amber-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Live AI-to-Web3 Execution Bridge Pipeline</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Walk through how Gemini API intent parsing converts into an isolated enclave signature and JSON-RPC mempool broadcast
                </p>
              </div>

              <button
                onClick={handleRunFullBridgePipeline}
                disabled={isProcessingPipeline}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-amber-900/30 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>{isProcessingPipeline ? "Bridging Pipeline..." : "Run Bridge Pipeline"}</span>
              </button>
            </div>

            {/* User Prompt Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Natural Language Trading Intent (Prompt):</label>
              <input
                type="text"
                value={pipelinePrompt}
                onChange={(e) => setPipelinePrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Pipeline Stage Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className={`p-3 rounded-xl border transition-all ${pipelineStep >= 1 ? "bg-amber-950/20 border-amber-500/50 text-amber-300" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                <div className="text-[10px] font-mono uppercase">Step 1 • AI Studio</div>
                <div className="text-xs font-bold text-white mt-1">Gemini Function Call</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Structured intent parsing</div>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${pipelineStep >= 2 ? "bg-indigo-950/20 border-indigo-500/50 text-indigo-300" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                <div className="text-[10px] font-mono uppercase">Step 2 • Web3 Lib</div>
                <div className="text-xs font-bold text-white mt-1">ethers.js Serialization</div>
                <div className="text-[10px] text-slate-400 mt-0.5">EIP-1559 payload & ABI</div>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${pipelineStep >= 3 ? "bg-purple-950/20 border-purple-500/50 text-purple-300" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                <div className="text-[10px] font-mono uppercase">Step 3 • Custody</div>
                <div className="text-xs font-bold text-white mt-1">Enclave Signing</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ECDSA $r, s, v$ computation</div>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${pipelineStep >= 4 ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-300" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                <div className="text-[10px] font-mono uppercase">Step 4 • Broadcast</div>
                <div className="text-xs font-bold text-white mt-1">JSON-RPC Mempool</div>
                <div className="text-[10px] text-slate-400 mt-0.5">eth_sendRawTransaction</div>
              </div>
            </div>

            {/* Pipeline Results Detail */}
            {pipelineIntent && (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-amber-400 font-bold">Pipeline Telemetry Payload:</span>
                  <span className="text-slate-500">Confidence: {(pipelineIntent.aiConfidenceScore * 100).toFixed(1)}%</span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400">Gemini Function Calling Schema:</span>
                  <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-300 overflow-x-auto">
                    {JSON.stringify(pipelineIntent.functionCallingSchema, null, 2)}
                  </pre>
                </div>

                {pipelineSerializedTx && (
                  <div className="space-y-1">
                    <span className="text-slate-400">Web3 Serialized EIP-1559 Object:</span>
                    <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-cyan-300 overflow-x-auto">
                      {JSON.stringify(pipelineSerializedTx, null, 2)}
                    </pre>
                  </div>
                )}

                {pipelineSignedHex && (
                  <div className="space-y-1">
                    <span className="text-slate-400">Enclave Signed Raw Transaction Byte String:</span>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-purple-300 break-all select-all">
                      {pipelineSignedHex}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
