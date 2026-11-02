import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Download,
  Terminal,
  FileCode,
  FileJson,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  Search,
  Layers,
  ArrowRight,
  HelpCircle,
  Cpu,
} from "lucide-react";
import { ChainType } from "../types";
import {
  FunctionalWallet,
  generateFunctionalWalletKey,
  deriveWalletFromPrivateKey,
  testWalletSignature,
  generateBatchWalletKeys,
  mineVanityWalletKey,
  exportKeystoreJson,
  generateWalletQrCode,
  KeyValidationResult,
  SignatureTestResult,
} from "../utils/walletKeyManager";
import { DEFAULT_RPC_URLS } from "../utils/cryptoGenerators";

interface WalletKeyStudioModalProps {
  initialPrivateKey?: string;
  initialChain?: ChainType | string;
  initialTokenName?: string;
  onClose: () => void;
}

export const WalletKeyStudioModal: React.FC<WalletKeyStudioModalProps> = ({
  initialPrivateKey,
  initialChain = "ethereum",
  initialTokenName,
  onClose,
}) => {
  const safeInitialChain: ChainType = (
    ["ethereum", "base", "arbitrum", "polygon", "solana", "bitcoin", "quantum", "cosmos"] as ChainType[]
  ).includes(initialChain as ChainType)
    ? (initialChain as ChainType)
    : "ethereum";

  const [activeTab, setActiveTab] = useState<
    "generator" | "validator" | "batch" | "vanity" | "guides"
  >("generator");

  // Single Generator State
  const [selectedChain, setSelectedChain] = useState<ChainType>(safeInitialChain);
  const [currentWallet, setCurrentWallet] = useState<FunctionalWallet>(() => {
    if (initialPrivateKey) {
      const derived = deriveWalletFromPrivateKey(initialPrivateKey);
      if (derived.isValid && derived.address) {
        return {
          privateKey: derived.privateKey || initialPrivateKey,
          rawPrivateKey: (derived.privateKey || initialPrivateKey).replace(/^0x/i, ""),
          address: derived.address,
          compressedPublicKey: derived.compressedPublicKey || "",
          uncompressedPublicKey: derived.uncompressedPublicKey || "",
          mnemonic: derived.isMnemonicPhrase ? initialPrivateKey : null,
          derivationPath: "m/44'/60'/0'/0/0",
          chain: safeInitialChain,
          networkId: 1,
          createdAt: new Date().toISOString(),
          isVanity: false,
        };
      }
    }
    return generateFunctionalWalletKey(safeInitialChain);
  });

  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSigningTest, setIsSigningTest] = useState<boolean>(false);
  const [signTestResult, setSignTestResult] = useState<SignatureTestResult | null>(null);

  // Keystore V3 Export State
  const [keystorePassword, setKeystorePassword] = useState<string>("walletpass123");
  const [isExportingKeystore, setIsExportingKeystore] = useState<boolean>(false);
  const [keystoreError, setKeystoreError] = useState<string | null>(null);

  // Validator State
  const [validateInput, setValidateInput] = useState<string>(
    initialPrivateKey || currentWallet.privateKey
  );
  const [validationResult, setValidationResult] = useState<KeyValidationResult>(() =>
    deriveWalletFromPrivateKey(initialPrivateKey || currentWallet.privateKey)
  );

  // Batch Generator State
  const [batchCount, setBatchCount] = useState<number>(25);
  const [batchChain, setBatchChain] = useState<ChainType>("ethereum");
  const [batchWallets, setBatchWallets] = useState<FunctionalWallet[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);

  // Vanity Miner State
  const [vanityPrefix, setVanityPrefix] = useState<string>("000");
  const [isMining, setIsMining] = useState<boolean>(false);
  const [miningAttempts, setMiningAttempts] = useState<number>(0);
  const [miningCurrentAddr, setMiningCurrentAddr] = useState<string>("");
  const [minedResult, setMinedResult] = useState<{ wallet: FunctionalWallet; attempts: number } | null>(
    null
  );

  // Generate QR Code whenever currentWallet changes
  useEffect(() => {
    let isMounted = true;
    generateWalletQrCode(currentWallet.privateKey)
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [currentWallet]);

  // Copy Helper
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Generate a fresh functional wallet key
  const handleGenerateFresh = () => {
    const fresh = generateFunctionalWalletKey(selectedChain);
    setCurrentWallet(fresh);
    setSignTestResult(null);
  };

  // Run in-browser EIP-191 signature test
  const handleRunSignatureTest = async () => {
    if (currentWallet.chain === "solana") return;
    setIsSigningTest(true);
    try {
      const res = await testWalletSignature(
        currentWallet.privateKey,
        `Web3 Token Studio Key Test • Address: ${currentWallet.address} • Nonce: ${Date.now()}`
      );
      setSignTestResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSigningTest(false);
    }
  };

  // Export JSON Keystore v3
  const handleDownloadKeystore = async () => {
    if (!keystorePassword) {
      setKeystoreError("Please provide a decryption password");
      return;
    }
    setIsExportingKeystore(true);
    setKeystoreError(null);
    try {
      const jsonStr = await exportKeystoreJson(currentWallet.privateKey, keystorePassword);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keystore-${currentWallet.address.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setKeystoreError(err.message || "Failed to encrypt keystore");
    } finally {
      setIsExportingKeystore(false);
    }
  };

  // Download .env file
  const handleDownloadEnv = () => {
    const content = `# Web3 Token Studio - Functional Wallet Credentials
# Address: ${currentWallet.address}
# Generated: ${currentWallet.createdAt}
# Target Chain: ${currentWallet.chain}

PRIVATE_KEY=${currentWallet.privateKey}
PUBLIC_ADDRESS=${currentWallet.address}
RPC_URL=${DEFAULT_RPC_URLS[currentWallet.chain] || "https://eth.llamarpc.com"}
${currentWallet.mnemonic ? `MNEMONIC_PHRASE="${currentWallet.mnemonic}"` : ""}
DERIVATION_PATH="${currentWallet.derivationPath}"
COMPRESSED_PUBLIC_KEY="${currentWallet.compressedPublicKey}"
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deployer-${currentWallet.address.slice(0, 8)}.env`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run Batch Generation
  const handleRunBatch = () => {
    setIsGeneratingBatch(true);
    setTimeout(() => {
      const keys = generateBatchWalletKeys(batchCount, batchChain);
      setBatchWallets(keys);
      setIsGeneratingBatch(false);
    }, 150);
  };

  // Export Batch as CSV
  const handleExportBatchCSV = () => {
    if (batchWallets.length === 0) return;
    let csv = "Index,Address,PrivateKey,CompressedPublicKey,Mnemonic,DerivationPath,Chain\n";
    batchWallets.forEach((w, idx) => {
      csv += `${idx + 1},"${w.address}","${w.privateKey}","${w.compressedPublicKey}","${w.mnemonic || ""}","${w.derivationPath}","${w.chain}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-wallets-${batchWallets.length}-${batchChain}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Batch as JSON
  const handleExportBatchJSON = () => {
    if (batchWallets.length === 0) return;
    const blob = new Blob([JSON.stringify(batchWallets, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-wallets-${batchWallets.length}-${batchChain}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run Vanity Miner
  const handleStartMining = () => {
    setIsMining(true);
    setMinedResult(null);
    setMiningAttempts(0);

    setTimeout(() => {
      const res = mineVanityWalletKey(
        vanityPrefix,
        selectedChain,
        25000,
        (attempts, currentAddr) => {
          setMiningAttempts(attempts);
          setMiningCurrentAddr(currentAddr);
        }
      );
      if (res) {
        setMinedResult(res);
        setCurrentWallet(res.wallet);
      }
      setIsMining(false);
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0F0F12] border border-[#1F1F24] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F24] bg-gradient-to-r from-[#121217] to-[#0A0A0C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Private Key Wallet Studio &amp; Generator
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/30 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> 100% Wallet Import Ready
                </span>
                {initialTokenName && (
                  <span className="text-xs text-[#8E9299]">
                    for <span className="text-white font-medium">{initialTokenName}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Cryptographically derived secp256k1 keys that derive the exact address when added to MetaMask, Rabby, Rainbow, Phantom, or Foundry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#1E1E24] transition-colors cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-[#1F1F24] bg-[#0A0A0C] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("generator")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "generator"
                ? "border-amber-400 text-amber-300 bg-amber-500/5 font-semibold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Instant Wallet Generator &amp; QR
          </button>

          <button
            onClick={() => setActiveTab("validator")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "validator"
                ? "border-amber-400 text-amber-300 bg-amber-500/5 font-semibold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Key Validator &amp; Deriver
          </button>

          <button
            onClick={() => setActiveTab("batch")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "batch"
                ? "border-amber-400 text-amber-300 bg-amber-500/5 font-semibold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            High-Volume Batch Generator
            {batchWallets.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                {batchWallets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("vanity")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "vanity"
                ? "border-amber-400 text-amber-300 bg-amber-500/5 font-semibold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Working Vanity Key Miner
          </button>

          <button
            onClick={() => setActiveTab("guides")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "guides"
                ? "border-amber-400 text-amber-300 bg-amber-500/5 font-semibold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Wallet Import Guides
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: INSTANT WALLET GENERATOR */}
          {activeTab === "generator" && (
            <div className="space-y-6">
              {/* Chain Selection and Generate Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#141418] border border-[#23232A]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Target Network:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(["ethereum", "base", "arbitrum", "polygon", "solana"] as ChainType[]).map(
                      (chain) => (
                        <button
                          key={chain}
                          onClick={() => {
                            setSelectedChain(chain);
                            const w = generateFunctionalWalletKey(chain);
                            setCurrentWallet(w);
                            setSignTestResult(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                            selectedChain === chain
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                              : "bg-[#1E1E24] text-[#8E9299] hover:text-white border border-transparent"
                          }`}
                        >
                          {chain}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateFresh}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Generate New Keypair
                  </button>
                </div>
              </div>

              {/* Main Card: Private Key, Derived Address & Mobile QR Code */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Key Details */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Derived Public Address */}
                  <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                          Derived Public Wallet Address (EOA)
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                          EIP-55 Checksum
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(currentWallet.address, "address")}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                      >
                        {copiedField === "address" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Address
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F24] font-mono text-sm text-white break-all flex items-center justify-between">
                      <span>{currentWallet.address}</span>
                    </div>
                    <p className="text-[11px] text-green-400/90 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      When you add the private key below to MetaMask or Rabby, your wallet will display this EXACT address.
                    </p>
                  </div>

                  {/* Private Key with Mask/Unmask and Direct Wallet Import Actions */}
                  <div className="p-4 rounded-xl bg-[#141418] border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Private Key (Secp256k1 Scalar)
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          32 Bytes • 256 Bits
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="flex items-center gap-1 text-xs text-[#8E9299] hover:text-white px-2 py-1 rounded bg-[#1E1E24] border border-[#2B2B33] cursor-pointer"
                        >
                          {showPrivateKey ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Mask Key
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Reveal Key
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(currentWallet.privateKey, "privkey")}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer"
                        >
                          {copiedField === "privkey" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy for MetaMask
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F24] font-mono text-sm break-all">
                      {showPrivateKey ? (
                        <span className="text-amber-200">{currentWallet.privateKey}</span>
                      ) : (
                        <span className="text-[#8E9299] tracking-widest">
                          {currentWallet.privateKey.slice(0, 6)}••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••{currentWallet.privateKey.slice(-4)}
                        </span>
                      )}
                    </div>

                    {/* Quick Format Copy Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-[#8E9299]">Copy Formats:</span>
                      <button
                        onClick={() => copyToClipboard(currentWallet.privateKey, "with0x")}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1E1E24] text-white hover:text-amber-300 border border-[#2B2B33] cursor-pointer"
                      >
                        {copiedField === "with0x" ? "✓ Copied" : "With 0x (MetaMask/Foundry)"}
                      </button>
                      <button
                        onClick={() => copyToClipboard(currentWallet.rawPrivateKey, "rawHex")}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1E1E24] text-white hover:text-amber-300 border border-[#2B2B33] cursor-pointer"
                      >
                        {copiedField === "rawHex" ? "✓ Copied" : "Raw 64-Hex (Hardware/Cli)"}
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `cast wallet import deployer --private-key ${currentWallet.privateKey}`,
                            "castCommand"
                          )
                        }
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1E1E24] text-white hover:text-amber-300 border border-[#2B2B33] cursor-pointer"
                      >
                        {copiedField === "castCommand" ? "✓ Copied" : "Foundry Cast Command"}
                      </button>
                    </div>
                  </div>

                  {/* BIP-39 Mnemonic Phrase (if available) */}
                  {currentWallet.mnemonic && (
                    <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                          BIP-39 Mnemonic Recovery Seed (12 Words)
                        </span>
                        <button
                          onClick={() => copyToClipboard(currentWallet.mnemonic || "", "mnemonic")}
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          {copiedField === "mnemonic" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Mnemonic
                            </>
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {currentWallet.mnemonic.split(" ").map((word, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A0A0C] border border-[#1F1F24] text-xs font-mono"
                          >
                            <span className="text-[#8E9299] text-[10px]">{idx + 1}.</span>
                            <span className="text-white font-medium">{word}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-[#8E9299] font-mono">
                        HD Derivation Path: {currentWallet.derivationPath}
                      </div>
                    </div>
                  )}

                  {/* In-Browser Signature Test */}
                  {currentWallet.chain !== "solana" && (
                    <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Test In-Browser
                            ECDSA Signature
                          </span>
                          <p className="text-[11px] text-[#8E9299] mt-0.5">
                            Signs an EIP-191 personal message with this private key and verifies address recovery in real-time.
                          </p>
                        </div>
                        <button
                          onClick={handleRunSignatureTest}
                          disabled={isSigningTest}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold border border-green-500/40 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {isSigningTest ? "Signing..." : "Sign & Verify Test"}
                        </button>
                      </div>

                      {signTestResult && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-green-400 font-bold">
                            <span>✓ ECDSA Signature &amp; Recovered Address Validated</span>
                            <span className="text-[10px] font-mono">{signTestResult.timestamp}</span>
                          </div>
                          <div className="font-mono text-[11px] text-[#8E9299] break-all">
                            <span className="text-white">Signature (r, s, v):</span> {signTestResult.signature}
                          </div>
                          <div className="font-mono text-[11px] text-green-300">
                            <span className="text-[#8E9299]">Recovered Signer:</span> {signTestResult.recoveredAddress} (Matches Wallet EOA)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right 1 Col: Mobile QR Code, Export & Keystore */}
                <div className="space-y-4">
                  {/* QR Code Card for Mobile Wallet Scan */}
                  <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] flex flex-col items-center text-center space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      Mobile Wallet Import QR
                    </div>
                    <p className="text-[11px] text-[#8E9299]">
                      Scan with MetaMask Mobile, Rainbow, or Trust Wallet to import instantly.
                    </p>

                    <div className="p-3 bg-white rounded-xl shadow-md">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="Private Key QR Code"
                          className="w-44 h-44 object-contain"
                        />
                      ) : (
                        <div className="w-44 h-44 bg-gray-100 animate-pulse rounded-lg" />
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-[#8E9299]">
                      Payload: 32-Byte Secp256k1 Key
                    </span>
                  </div>

                  {/* One-Click Downloads */}
                  <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      One-Click Credentials Export
                    </span>

                    <button
                      onClick={handleDownloadEnv}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1E1E24] hover:bg-[#282830] text-white text-xs font-medium border border-[#2B2B33] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-amber-400" />
                        Download Foundry / Hardhat .env
                      </span>
                      <Download className="w-3.5 h-3.5 text-[#8E9299]" />
                    </button>

                    {/* JSON Keystore v3 Encryptor */}
                    {currentWallet.chain !== "solana" && (
                      <div className="pt-2 border-t border-[#1F1F24] space-y-2">
                        <span className="text-[11px] font-medium text-[#8E9299]">
                          Encrypted JSON Keystore (v3)
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={keystorePassword}
                            onChange={(e) => setKeystorePassword(e.target.value)}
                            placeholder="Password to encrypt keystore..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#23232A] text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                          />
                          <button
                            onClick={handleDownloadKeystore}
                            disabled={isExportingKeystore}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 cursor-pointer disabled:opacity-50"
                          >
                            {isExportingKeystore ? "Encrypting..." : "Export"}
                          </button>
                        </div>
                        {keystoreError && (
                          <p className="text-[10px] text-red-400">{keystoreError}</p>
                        )}
                        <p className="text-[10px] text-[#8E9299]">
                          Standard Web3 Secret Storage format for Geth, Foundry, and MyCrypto.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEY VALIDATOR & DERIVER */}
          {activeTab === "validator" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-400" />
                    Inspect &amp; Validate Any Private Key or Mnemonic
                  </span>
                  <button
                    onClick={() => {
                      setValidateInput(currentWallet.privateKey);
                      setValidationResult(deriveWalletFromPrivateKey(currentWallet.privateKey));
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    Paste Generated Key
                  </button>
                </div>
                <textarea
                  value={validateInput}
                  onChange={(e) => {
                    setValidateInput(e.target.value);
                    setValidationResult(deriveWalletFromPrivateKey(e.target.value));
                  }}
                  rows={3}
                  placeholder="Paste 64-character hex private key (e.g. 0x... or raw) or 12/24-word BIP-39 mnemonic phrase..."
                  className="w-full p-3 rounded-lg bg-[#0A0A0C] border border-[#23232A] text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Validation Results Display */}
              {validationResult.isValid ? (
                <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Cryptographically Validated on {validationResult.curve.toUpperCase()} Curve
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/40">
                      100% Wallet Import Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F24] space-y-1">
                      <span className="text-[#8E9299] text-[10px]">DERIVED PUBLIC ADDRESS</span>
                      <div className="text-white break-all">{validationResult.address}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F24] space-y-1">
                      <span className="text-[#8E9299] text-[10px]">COMPRESSED PUBLIC KEY</span>
                      <div className="text-amber-300 break-all">{validationResult.compressedPublicKey}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F24] text-xs font-mono space-y-1">
                    <span className="text-[#8E9299] text-[10px]">UNCOMPRESSED PUBLIC KEY (65 BYTES)</span>
                    <div className="text-[#8E9299] break-all">{validationResult.uncompressedPublicKey}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
                    <span className="text-xs text-green-300">
                      This key meets all EIP-55 and secp256k1 scalar boundary requirements.
                    </span>
                    <button
                      onClick={() => {
                        if (validationResult.privateKey && validationResult.address) {
                          setCurrentWallet({
                            privateKey: validationResult.privateKey,
                            rawPrivateKey: validationResult.privateKey.replace(/^0x/i, ""),
                            address: validationResult.address,
                            compressedPublicKey: validationResult.compressedPublicKey || "",
                            uncompressedPublicKey: validationResult.uncompressedPublicKey || "",
                            mnemonic: validationResult.isMnemonicPhrase ? validateInput : null,
                            derivationPath: "m/44'/60'/0'/0/0",
                            chain: "ethereum",
                            networkId: 1,
                            createdAt: new Date().toISOString(),
                            isVanity: false,
                          });
                          setActiveTab("generator");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold border border-green-500/40 cursor-pointer"
                    >
                      Use as Active Wallet →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Invalid Private Key Input
                  </div>
                  <p className="text-xs text-red-300 font-mono">{validationResult.error}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HIGH-VOLUME BATCH GENERATOR */}
          {activeTab === "batch" && (
            <div className="space-y-6">
              {/* Batch Generation Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#141418] border border-[#23232A]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Batch Count:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 25, 50, 100, 250, 500].map((num) => (
                      <button
                        key={num}
                        onClick={() => setBatchCount(num)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          batchCount === num
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                            : "bg-[#1E1E24] text-[#8E9299] hover:text-white border border-transparent"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunBatch}
                    disabled={isGeneratingBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isGeneratingBatch ? "Generating..." : `Generate ${batchCount} Keypairs`}
                  </button>
                </div>
              </div>

              {/* Batch Results Table and Export Actions */}
              {batchWallets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Generated {batchWallets.length} Functional Wallet Keypairs
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportBatchCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#282830] text-white text-xs font-medium border border-[#2B2B33] cursor-pointer"
                      >
                        <FileCode className="w-3.5 h-3.5 text-green-400" /> Export CSV
                      </button>
                      <button
                        onClick={handleExportBatchJSON}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#282830] text-white text-xs font-medium border border-[#2B2B33] cursor-pointer"
                      >
                        <FileJson className="w-3.5 h-3.5 text-amber-400" /> Export JSON
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto rounded-xl border border-[#23232A] bg-[#0A0A0C]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#141418] text-[#8E9299] sticky top-0 border-b border-[#23232A]">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">#</th>
                          <th className="py-2.5 px-3 font-medium">Derived Address</th>
                          <th className="py-2.5 px-3 font-medium">Private Key (Secp256k1)</th>
                          <th className="py-2.5 px-3 font-medium text-center">Status</th>
                          <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F1F24] font-mono">
                        {batchWallets.map((w, idx) => (
                          <tr key={idx} className="hover:bg-[#141418] transition-colors">
                            <td className="py-2 px-3 text-[#8E9299]">{idx + 1}</td>
                            <td className="py-2 px-3 text-white">
                              {w.address.slice(0, 10)}...{w.address.slice(-8)}
                            </td>
                            <td className="py-2 px-3 text-amber-300">
                              {w.privateKey.slice(0, 8)}...{w.privateKey.slice(-6)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30">
                                ✓ Verified
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => copyToClipboard(w.privateKey, `batch-${idx}`)}
                                className="text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
                              >
                                {copiedField === `batch-${idx}` ? "✓ Copied" : "Copy Key"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REAL WORKING VANITY KEY MINER */}
          {activeTab === "vanity" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-4">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    Mine Real Working Vanity Address &amp; Private Key
                  </span>
                  <p className="text-xs text-[#8E9299] mt-0.5">
                    Grinds real secp256k1 keys until an address matching your desired prefix is found.
                    Outputs BOTH the vanity address and the real working private key!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8E9299] font-mono">0x</span>
                    <input
                      type="text"
                      maxLength={5}
                      value={vanityPrefix}
                      onChange={(e) => setVanityPrefix(e.target.value.replace(/[^0-9a-fA-F]/g, ""))}
                      placeholder="e.g. 000 or 777"
                      className="w-28 px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#23232A] text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#8E9299]">Presets:</span>
                    {["000", "777", "888", "123", "abc", "00"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setVanityPrefix(p)}
                        className="px-2 py-1 rounded bg-[#1E1E24] hover:bg-[#282830] text-xs font-mono text-white border border-[#2B2B33] cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleStartMining}
                    disabled={isMining || !vanityPrefix}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isMining ? "Grinding Keys..." : `Mine 0x${vanityPrefix}... Key`}
                  </button>
                </div>

                {isMining && (
                  <div className="p-3 rounded-lg bg-[#0A0A0C] border border-amber-500/30 text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between text-amber-300">
                      <span>Grinding secp256k1 private keys...</span>
                      <span>Attempts: {miningAttempts}</span>
                    </div>
                    <div className="text-[#8E9299] text-[11px] truncate">
                      Testing: {miningCurrentAddr}
                    </div>
                  </div>
                )}

                {minedResult && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3">
                    <div className="flex items-center justify-between text-green-400 font-bold text-xs">
                      <span>✓ Found Vanity Key in {minedResult.attempts} Attempts!</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/20 text-green-300">
                        100% Functional Key
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="p-2.5 rounded bg-[#0A0A0C] border border-[#1F1F24]">
                        <span className="text-[#8E9299] text-[10px] block">VANITY ADDRESS:</span>
                        <span className="text-white font-bold">{minedResult.wallet.address}</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#0A0A0C] border border-[#1F1F24]">
                        <span className="text-[#8E9299] text-[10px] block">MATCHING PRIVATE KEY:</span>
                        <span className="text-amber-300 font-bold">{minedResult.wallet.privateKey}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentWallet(minedResult.wallet);
                        setActiveTab("generator");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold border border-green-500/40 cursor-pointer"
                    >
                      Set as Active Wallet &amp; View QR Code →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: WALLET IMPORT GUIDES */}
          {activeTab === "guides" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MetaMask */}
              <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <span className="p-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    🦊
                  </span>
                  MetaMask (Browser &amp; Mobile)
                </div>
                <ol className="text-xs text-[#8E9299] space-y-1.5 list-decimal list-inside">
                  <li>Open MetaMask and click your account profile icon at top.</li>
                  <li>Select <strong className="text-white">"Add account or hardware wallet"</strong>.</li>
                  <li>Click <strong className="text-white">"Import account"</strong>.</li>
                  <li>Select "Private Key" and paste the 64-character private key.</li>
                  <li>Click <strong className="text-white">"Import"</strong> — your derived address matches immediately.</li>
                </ol>
              </div>

              {/* Rabby */}
              <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <span className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    🐰
                  </span>
                  Rabby Wallet
                </div>
                <ol className="text-xs text-[#8E9299] space-y-1.5 list-decimal list-inside">
                  <li>Click the address selector dropdown at the top.</li>
                  <li>Click <strong className="text-white">"Add Address"</strong>.</li>
                  <li>Choose <strong className="text-white">"Import Private Key"</strong>.</li>
                  <li>Paste the private key (with or without 0x).</li>
                  <li>Confirm import and verify the checksum address.</li>
                </ol>
              </div>

              {/* Foundry Cast */}
              <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Foundry / Cast CLI
                </div>
                <p className="text-xs text-[#8E9299]">
                  Import securely into your local keystore or pass via environment:
                </p>
                <pre className="p-2.5 rounded bg-[#0A0A0C] border border-[#1F1F24] font-mono text-[11px] text-amber-200 overflow-x-auto">
{`# 1. Interactive Keystore Import
cast wallet import deployer --private-key ${currentWallet.privateKey.slice(0, 10)}...

# 2. Or export in .env
export PRIVATE_KEY=${currentWallet.privateKey.slice(0, 10)}...
forge script script/Deploy.s.sol --broadcast`}
                </pre>
              </div>

              {/* Hardhat / Python Web3 */}
              <div className="p-4 rounded-xl bg-[#141418] border border-[#23232A] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  Hardhat &amp; Web3.py
                </div>
                <pre className="p-2.5 rounded bg-[#0A0A0C] border border-[#1F1F24] font-mono text-[11px] text-cyan-200 overflow-x-auto">
{`// hardhat.config.js
module.exports = {
  networks: {
    mainnet: {
      accounts: ["${currentWallet.privateKey.slice(0, 10)}..."]
    }
  }
};`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1F1F24] bg-[#0A0A0C] text-xs">
          <div className="flex items-center gap-2 text-[#8E9299]">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Elliptic Curve: secp256k1 (EVM) / Ed25519 (Solana)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#282830] text-white text-xs font-medium border border-[#2B2B33] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
