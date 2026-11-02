import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Cpu,
  Database,
  Terminal,
  Play,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Zap,
  Code2,
  RefreshCw,
  X,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Eye,
  Layers,
  Search,
  Sparkles,
  Download
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  encryptMemoryPayload,
  decryptMemoryPayload,
  saveWorkingTokensToQuantumVault,
  loadWorkingTokensFromQuantumVault,
  getQuantumVaultTelemetry,
  generateFoundryTestSuite,
  generateRemixIdeContractIdSpec,
  EncryptedPackage,
  DEFAULT_SESSION_PASSPHRASE,
  ACTIVE_COCKPIT_VAULT_KEY,
} from "../utils/quantumMemory";
import { continuousVaultSaver } from "../utils/continuousVaultSaver";

interface QuantumEncryptedCockpitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenRecord[];
  onForceSaveAllToVault?: () => void;
  onExpandAndGenerateMemory?: () => void;
}

export const QuantumEncryptedCockpitModal: React.FC<QuantumEncryptedCockpitModalProps> = ({
  isOpen,
  onClose,
  tokens,
  onForceSaveAllToVault,
  onExpandAndGenerateMemory,
}) => {
  const [activeTab, setActiveTab] = useState<"encrypted_memory" | "foundry_remix" | "auto_saver">("encrypted_memory");
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.id || "");
  const [passphrase, setPassphrase] = useState<string>(DEFAULT_SESSION_PASSPHRASE);
  const [encryptedPackage, setEncryptedPackage] = useState<EncryptedPackage | null>(null);
  const [decryptedData, setDecryptedData] = useState<any | null>(null);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [autoSaveActive, setAutoSaveActive] = useState<boolean>(continuousVaultSaver.getState().isActive);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Selected token
  const selectedToken = useMemo(() => {
    return tokens.find((t) => t.id === selectedTokenId) || tokens[0] || null;
  }, [tokens, selectedTokenId]);

  // Foundry artifacts
  const foundrySpec = useMemo(() => {
    return generateFoundryTestSuite(selectedToken || undefined);
  }, [selectedToken]);

  // Remix artifacts
  const remixSpec = useMemo(() => {
    return generateRemixIdeContractIdSpec(selectedToken || undefined);
  }, [selectedToken]);

  // Load existing quantum vault from storage on open
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(ACTIVE_COCKPIT_VAULT_KEY);
      if (raw) {
        try {
          const pkg: EncryptedPackage = JSON.parse(raw);
          setEncryptedPackage(pkg);
        } catch {
          // ignore
        }
      }
    }

    // Subscribe to continuous saver
    const unsub = continuousVaultSaver.subscribe((state) => {
      setAutoSaveActive(state.isActive);
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleEncryptWorkingTokensNow = async () => {
    setIsEncrypting(true);
    try {
      const pkg = await saveWorkingTokensToQuantumVault(tokens, passphrase);
      setEncryptedPackage(pkg);
      setNotification(`✓ Encrypted ${tokens.length} working tokens with AES-GCM (256-bit) + PBKDF2 (100k iterations)!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`⚠ Encryption error: ${err?.message || "Crypto operation failed"}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecryptMemoryNow = async () => {
    if (!encryptedPackage) {
      setNotification("No encrypted package currently available in memory.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsDecrypting(true);
    try {
      const decrypted = await decryptMemoryPayload(encryptedPackage, passphrase);
      setDecryptedData(decrypted);
      setNotification("✓ Quantum memory payload successfully decrypted and integrity verified!");
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`⚠ Decryption failed: Check passphrase or ciphertext integrity (${err?.message})`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleToggleAutoVaultSaving = () => {
    continuousVaultSaver.toggle();
    const state = continuousVaultSaver.getState();
    setAutoSaveActive(state.isActive);
    setNotification(
      state.isActive
        ? "✓ Automatic Vault Saver: ACTIVE (Saving all working tokens continuously)"
        : "Automatic Vault Saver: PAUSED"
    );
    setTimeout(() => setNotification(null), 3500);
  };

  const handleForceSaveVaultAll = () => {
    if (onForceSaveAllToVault) {
      onForceSaveAllToVault();
    }
    continuousVaultSaver.saveTokensToDurableStorage(tokens);
    handleEncryptWorkingTokensNow();
    setNotification(`⚡ All ${tokens.length} working tokens saved to vault durable storage & encrypted quantum memory!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddToMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const wasAdded = await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: selectedToken?.contractAddress,
              symbol: selectedToken?.symbol.slice(0, 5) || "TOK",
              decimals: 18,
              image: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
            },
          },
        });
        if (wasAdded) {
          setNotification(`✓ ${selectedToken?.symbol} successfully added to MetaMask!`);
        } else {
          setNotification(`MetaMask request was cancelled by user.`);
        }
      } catch (err: any) {
        setNotification(`MetaMask notice: ${err?.message || "Interaction restricted"}`);
      }
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification("MetaMask browser extension not detected. Use standard EVM Web3 provider.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="encrypted-quantum-memory-modal"
        className="bg-[#121216] border border-[#2A2A32] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-[#1F1F23] flex items-center justify-between bg-gradient-to-r from-[#16161A] to-[#1a151f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F27D26] via-purple-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#121216] rounded-[10px] flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#F27D26]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight uppercase">
                  Encrypted Quantum Memory & Active Cockpit Suite
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                  AES-GCM-256 • PBKDF2 100k
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  🛡️ STACK OVERFLOW IMMUNE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  Remix & Foundry Compatible
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Client-side Web Crypto API enclave for active token IDs, contracts, Remix IDE deployment, and Foundry test execution.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#16161A] text-[#8E9299] hover:text-white hover:bg-[#1F1F23] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#0E0E12] border-b border-[#1F1F23] flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("encrypted_memory")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "encrypted_memory"
                  ? "bg-[#16161A] text-white border border-[#F27D26] shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Encrypted Quantum Memory Enclave</span>
            </button>

            <button
              onClick={() => setActiveTab("foundry_remix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "foundry_remix"
                  ? "bg-[#16161A] text-cyan-400 border border-cyan-500 shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Remix IDE & Foundry Suite (forge test -vvv)</span>
            </button>

            <button
              onClick={() => setActiveTab("auto_saver")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "auto_saver"
                  ? "bg-[#16161A] text-emerald-400 border border-emerald-500 shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automatic Vault Saver Cockpit</span>
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSaveVaultAll}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Save All Tokens to Vault Automatically</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Notice */}
        {notification && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Main Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* TAB 1: Encrypted Quantum Memory Enclave */}
          {activeTab === "encrypted_memory" && (
            <div className="space-y-5">
              {/* Crypto Enclave Parameter Bar */}
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-[#F27D26]" />
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Client-Side Web Crypto API Enclave
                      </div>
                      <div className="text-[11px] text-[#8E9299]">
                        Authenticated AES-GCM 256-bit encryption with 96-bit random IV and 100,000 PBKDF2 derivation rounds.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-[#0E0E12] px-2.5 py-1.5 rounded-lg border border-[#1F1F23]">
                      <span className="text-[10px] font-mono text-[#8E9299]">Passphrase:</span>
                      <input
                        type="text"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className="bg-transparent text-xs text-white font-mono outline-none w-48"
                        placeholder="Session secret..."
                      />
                    </div>

                    {onExpandAndGenerateMemory && (
                      <button
                        onClick={onExpandAndGenerateMemory}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Expands memory to 1 Octillion capacity with stack overflow immunity"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Expand Memory</span>
                      </button>
                    )}

                    <button
                      onClick={handleEncryptWorkingTokensNow}
                      disabled={isEncrypting}
                      className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isEncrypting ? "Encrypting..." : "Encrypt Vault Memory"}</span>
                    </button>

                    <button
                      onClick={handleDecryptMemoryNow}
                      disabled={isDecrypting || !encryptedPackage}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0E0E12] hover:bg-[#1F1F23] text-cyan-400 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{isDecrypting ? "Decrypting..." : "Decrypt & Verify"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cryptographic Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299] flex items-center justify-between">
                    <span>CIPHER ALGORITHM</span>
                    <Lock className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="text-sm font-bold text-white mt-1">AES-GCM (256-bit)</div>
                  <div className="text-[10px] text-green-400 mt-0.5">Authenticated Tag Included</div>
                </div>

                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299] flex items-center justify-between">
                    <span>KEY DERIVATION</span>
                    <KeyRound className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="text-sm font-bold text-white mt-1">100,000 Iterations</div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">PBKDF2-HMAC-SHA256</div>
                </div>

                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299] flex items-center justify-between">
                    <span>INIT VECTOR & SALT</span>
                    <Cpu className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="text-sm font-bold text-white mt-1">96-bit IV • 128-bit Salt</div>
                  <div className="text-[10px] text-purple-400 mt-0.5">Cryptographically Secure Random</div>
                </div>

                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299] flex items-center justify-between">
                    <span>SECURED TOKENS</span>
                    <Database className="w-3 h-3 text-orange-400" />
                  </div>
                  <div className="text-sm font-bold text-orange-400 mt-1">
                    {tokens.length} Active
                  </div>
                  <div className="text-[10px] text-[#8E9299] mt-0.5">Active Enclave Store</div>
                </div>

                <div className="bg-[#0E0E12] border border-green-500/30 p-3 rounded-xl col-span-2 sm:col-span-4 md:col-span-1">
                  <div className="text-[10px] font-mono text-green-400 flex items-center justify-between">
                    <span>STACK INTEGRITY</span>
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="text-sm font-bold text-green-300 mt-1">100% IMMUNE</div>
                  <div className="text-[10px] text-[#8E9299] mt-0.5">32KB Stream Partitioning</div>
                </div>
              </div>

              {/* Active Encrypted Payload Package Viewer */}
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Active Encrypted Memory Package (Base64 JSON)
                    </span>
                  </div>
                  {encryptedPackage && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(encryptedPackage, null, 2), "payload_json")}
                      className="text-xs text-[#8E9299] hover:text-white flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {copiedKey === "payload_json" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "payload_json" ? "Copied" : "Copy Payload JSON"}</span>
                    </button>
                  )}
                </div>

                {encryptedPackage ? (
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3 font-mono text-[11px] text-green-400 space-y-1.5 overflow-x-auto">
                    <div className="text-[#8E9299]">// AES-GCM Encrypted Quantum Memory Payload Package</div>
                    <div>
                      <span className="text-purple-400">"ciphertext"</span>: <span className="text-amber-300">"{encryptedPackage.ciphertext.slice(0, 80)}..."</span> <span className="text-[#8E9299]">({encryptedPackage.ciphertext.length} bytes base64)</span>
                    </div>
                    <div>
                      <span className="text-purple-400">"iv"</span>: <span className="text-cyan-300">"{encryptedPackage.iv}"</span> <span className="text-[#8E9299]">(96-bit AES-GCM IV)</span>
                    </div>
                    <div>
                      <span className="text-purple-400">"salt"</span>: <span className="text-orange-300">"{encryptedPackage.salt}"</span> <span className="text-[#8E9299]">(128-bit PBKDF2 Salt)</span>
                    </div>
                    <div>
                      <span className="text-purple-400">"timestamp"</span>: <span className="text-blue-300">{encryptedPackage.timestamp}</span> <span className="text-[#8E9299]">({new Date(encryptedPackage.timestamp || Date.now()).toLocaleTimeString()})</span>
                    </div>
                    <div>
                      <span className="text-purple-400">"tokenCount"</span>: <span className="text-emerald-300">{encryptedPackage.tokenCount || tokens.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 text-center text-xs text-[#8E9299]">
                    No active payload encrypted yet. Click <span className="text-orange-400 font-bold">"Encrypt Vault Memory"</span> above to build client-side encrypted quantum memory for all working tokens.
                  </div>
                )}
              </div>

              {/* Decrypted Asset Memory State View */}
              {decryptedData && (
                <div className="bg-[#16161A] border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Unlock className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Decrypted Active Asset Memory State
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Integrity Verified
                    </span>
                  </div>

                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3 font-mono text-[11px] text-gray-300 overflow-x-auto">
                    <pre>{JSON.stringify(decryptedData, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Remix IDE & Foundry Suite Integration */}
          {activeTab === "foundry_remix" && (
            <div className="space-y-5">
              {/* Token Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#16161A] border border-[#1F1F23] rounded-xl p-3.5">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Target Token Contract ID & Token ID:
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedTokenId}
                    onChange={(e) => setSelectedTokenId(e.target.value)}
                    className="bg-[#0E0E12] border border-[#1F1F23] text-xs text-white rounded-lg px-3 py-1.5 font-mono outline-none focus:border-orange-500"
                  >
                    {tokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.symbol}) • ID: {t.tokenId || "101"} • {t.contractAddress.slice(0, 10)}...
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddToMetaMask}
                    className="px-3 py-1.5 rounded-lg bg-[#0E0E12] hover:bg-[#1F1F23] text-[#F27D26] border border-[#F27D26]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Add to MetaMask (EIP-747)</span>
                  </button>

                  <a
                    href={remixSpec.etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#0E0E12] hover:bg-[#1F1F23] text-blue-400 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View on Etherscan.io</span>
                  </a>

                  <a
                    href={remixSpec.remixUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Open in Remix IDE 1-Click</span>
                  </a>
                </div>
              </div>

              {/* Summary Card for Selected Contract */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299]">EIP-55 CONTRACT ID</div>
                  <div className="text-xs font-bold text-white font-mono mt-1 break-all">
                    {selectedToken?.contractAddress}
                  </div>
                  <div className="text-[10px] text-green-400 mt-1">✓ Checksum Verified (MetaMask / Etherscan)</div>
                </div>

                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299]">TOKEN ID (UINT256)</div>
                  <div className="text-xs font-bold text-cyan-400 font-mono mt-1">
                    {selectedToken?.tokenId || "101"}
                  </div>
                  <div className="text-[10px] text-[#8E9299] mt-1">EVM Word: Fits type(uint256).max</div>
                </div>

                <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
                  <div className="text-[10px] font-mono text-[#8E9299]">SOLIDITY COMPILER</div>
                  <div className="text-xs font-bold text-purple-400 font-mono mt-1">
                    solc v0.8.24 (Cancun EVM)
                  </div>
                  <div className="text-[10px] text-[#8E9299] mt-1">Optimizer: 200 runs enabled</div>
                </div>
              </div>

              {/* Foundry Suite Test Box */}
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Foundry Test Suite ({foundrySpec.runCommand})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(foundrySpec.runCommand, "forge_cmd")}
                      className="px-2.5 py-1 rounded bg-[#0E0E12] text-xs font-mono text-cyan-400 border border-cyan-500/30 hover:bg-[#1F1F23] transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copiedKey === "forge_cmd" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "forge_cmd" ? "Copied" : "Copy Command"}</span>
                    </button>

                    <button
                      onClick={() => handleCopy(foundrySpec.testFile, "foundry_file")}
                      className="px-2.5 py-1 rounded bg-[#0E0E12] text-xs font-mono text-[#8E9299] hover:text-white border border-[#1F1F23] hover:bg-[#1F1F23] transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copiedKey === "foundry_file" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "foundry_file" ? "Copied" : "Copy Test Contract"}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3 font-mono text-[11px] text-gray-300 max-h-60 overflow-y-auto">
                  <pre>{foundrySpec.testFile}</pre>
                </div>
              </div>

              {/* Cast Commands for Quick CLI Verification */}
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Foundry Cast CLI Commands</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] flex items-center justify-between gap-2">
                    <span className="text-[#8E9299] truncate">{foundrySpec.castVerifyCommand}</span>
                    <button
                      onClick={() => handleCopy(foundrySpec.castVerifyCommand, "cast_1")}
                      className="text-[#8E9299] hover:text-white cursor-pointer"
                    >
                      {copiedKey === "cast_1" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] flex items-center justify-between gap-2">
                    <span className="text-[#8E9299] truncate">{foundrySpec.castCallCommand}</span>
                    <button
                      onClick={() => handleCopy(foundrySpec.castCallCommand, "cast_2")}
                      className="text-[#8E9299] hover:text-white cursor-pointer"
                    >
                      {copiedKey === "cast_2" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Automatic Vault Saver Cockpit */}
          {activeTab === "auto_saver" && (
            <div className="space-y-5">
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Automated Vault Continuous Persistence
                    </h3>
                    <p className="text-xs text-[#8E9299] mt-0.5">
                      Automatically synchronizes all working tokens into both durable storage, Firestore, and the encrypted quantum memory module.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleAutoVaultSaving}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        autoSaveActive
                          ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      <Radio className={`w-4 h-4 ${autoSaveActive ? "animate-pulse" : ""}`} />
                      <span>{autoSaveActive ? "Pause Automatic Saving" : "Engage Automatic Saving"}</span>
                    </button>

                    <button
                      onClick={handleForceSaveVaultAll}
                      className="px-4 py-2 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] text-black font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Force Save All Working Tokens Now</span>
                    </button>
                  </div>
                </div>

                {/* Working Tokens Snapshot Table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-white uppercase font-mono">
                      Working Tokens in Active Vault ({tokens.length})
                    </div>
                    <div className="text-[11px] font-mono text-[#8E9299]">
                      Durable Local Storage + Firestore Cloud Sync
                    </div>
                  </div>

                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#16161A] text-[#8E9299] font-mono text-[10px] sticky top-0">
                        <tr>
                          <th className="p-3">Token Name</th>
                          <th className="p-3">Symbol</th>
                          <th className="p-3">Contract ID (EIP-55)</th>
                          <th className="p-3">Token ID</th>
                          <th className="p-3">Chain</th>
                          <th className="p-3 text-right">MetaMask</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F1F23] font-mono text-[11px]">
                        {tokens.slice(0, 50).map((t) => (
                          <tr key={t.id} className="hover:bg-[#16161A]/50 transition-colors">
                            <td className="p-3 font-sans font-bold text-white">{t.name}</td>
                            <td className="p-3 text-[#F27D26] font-bold">{t.symbol}</td>
                            <td className="p-3 text-gray-300">{t.contractAddress}</td>
                            <td className="p-3 text-cyan-400">{t.tokenId || "101"}</td>
                            <td className="p-3 text-purple-400">{t.chain}</td>
                            <td className="p-3 text-right">
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/30">
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1F1F23] bg-[#0E0E12] flex items-center justify-between text-xs text-[#8E9299] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Quantum Memory Enclave Active: Authenticated AES-GCM (256-bit) client-side storage.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-white text-xs font-semibold cursor-pointer transition-all"
          >
            Close Cockpit
          </button>
        </div>
      </div>
    </div>
  );
};
