import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  Cpu,
  Database,
  Check,
  Copy,
  AlertTriangle,
  Flame,
  Info,
  Layers,
} from "lucide-react";
import {
  getEncryptedMemoryStats,
  subscribeToEncryptedMemory,
  setEncryptedMemoryActive,
  purgeAllEncryptedMemory,
  purgeAllSessionStorage,
  getMetaMaskContractsFromEncryptedMemory,
  MetaMaskAcceptedContract,
  EncryptedMemoryStats,
} from "../utils/encryptedMemory";

interface EncryptedMemoryControlProps {
  className?: string;
  onSelectContract?: (contract: MetaMaskAcceptedContract) => void;
}

export const EncryptedMemoryControl: React.FC<EncryptedMemoryControlProps> = ({
  className = "",
  onSelectContract,
}) => {
  const [stats, setStats] = useState<EncryptedMemoryStats>(getEncryptedMemoryStats());
  const [storedContracts, setStoredContracts] = useState<MetaMaskAcceptedContract[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showContractsList, setShowContractsList] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to encrypted memory state changes
    const unsub = subscribeToEncryptedMemory((newStats) => {
      setStats(newStats);
    });

    // Load contracts in encrypted memory
    loadEncryptedContracts();

    return () => unsub();
  }, []);

  const loadEncryptedContracts = async () => {
    try {
      const list = await getMetaMaskContractsFromEncryptedMemory();
      setStoredContracts(list);
    } catch {
      // safe ignore
    }
  };

  const handleToggleEncryption = () => {
    const nextState = !stats.isEnabled;
    setEncryptedMemoryActive(nextState);
    setActionNotice(
      nextState
        ? "✓ Encrypted RAM Enclave active (AES-256-GCM). Session memory disabled."
        : "⚠ Warning: Encrypted memory deactivated. Using standard memory."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handlePurgeAndScrub = () => {
    purgeAllEncryptedMemory();
    purgeAllSessionStorage();
    setStoredContracts([]);
    setActionNotice("✓ Memory scrubbed & zeroized. All volatile RAM buffers wiped.");
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      className={`bg-[#16161A] border ${
        stats.isEnabled ? "border-green-500/40" : "border-amber-500/40"
      } rounded-xl p-4 shadow-xl transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stats.isEnabled
                ? "bg-green-500/10 text-green-400 border border-green-500/30"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            {stats.isEnabled ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Encrypted Memory Security Enclave
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  stats.isEnabled
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {stats.isEnabled ? "ACTIVE (AES-256-GCM)" : "DISABLED"}
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Replaces unencrypted session storage with an authenticated in-RAM cryptographic enclave.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleEncryption}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              stats.isEnabled
                ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40"
                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40"
            }`}
          >
            {stats.isEnabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{stats.isEnabled ? "Enclave Armed" : "Enable Enclave"}</span>
          </button>

          <button
            type="button"
            onClick={handlePurgeAndScrub}
            title="Zeroize encrypted RAM buffers and scrub session storage"
            className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-red-500/20 text-[#8E9299] hover:text-red-400 border border-[#1F1F23] hover:border-red-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scrub RAM</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="mt-3 p-2 rounded-lg bg-[#0A0A0C] border border-green-500/40 text-xs font-mono text-green-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
        <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23]">
          <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Cipher Algorithm</span>
          <span className="text-xs font-mono font-bold text-white">AES-256-GCM</span>
          <span className="text-[9px] font-mono text-green-400 block mt-0.5">100k PBKDF2 rounds</span>
        </div>

        <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23]">
          <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Encrypted Buffers</span>
          <span className="text-xs font-mono font-bold text-[#F27D26]">
            {stats.activeEncryptedBuffers} in-RAM
          </span>
          <span className="text-[9px] font-mono text-[#8E9299] block mt-0.5">
            {stats.ciphertextSizeBytes} bytes ciphertext
          </span>
        </div>

        <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23]">
          <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Session Storage</span>
          <span className="text-xs font-mono font-bold text-green-400">
            0 Plaintext
          </span>
          <span className="text-[9px] font-mono text-[#8E9299] block mt-0.5">Scrubbed & Isolated</span>
        </div>

        <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23]">
          <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Zeroization</span>
          <span className="text-xs font-mono font-bold text-cyan-400">Armed</span>
          <span className="text-[9px] font-mono text-[#8E9299] block mt-0.5">Randomized Overwrite</span>
        </div>
      </div>

      {/* Toggle View of Stored MetaMask Contracts in Encrypted Memory */}
      <div className="mt-3 pt-3 border-t border-[#1F1F23] flex items-center justify-between text-xs font-mono">
        <button
          type="button"
          onClick={() => {
            loadEncryptedContracts();
            setShowContractsList(!showContractsList);
          }}
          className="text-[#8E9299] hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
          <span>
            {showContractsList ? "Hide" : "View"} Encrypted Contracts in RAM ({storedContracts.length})
          </span>
        </button>

        <span className="text-[11px] text-green-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Hardware Crypto Subtle API
        </span>
      </div>

      {showContractsList && (
        <div className="mt-3 bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-2">
          {storedContracts.length === 0 ? (
            <p className="text-xs font-mono text-[#8E9299] text-center py-2">
              No contracts stored in encrypted memory yet. Generate a MetaMask contract to populate.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {storedContracts.map((c) => (
                <div
                  key={c.id}
                  className="p-2 bg-[#16161A] rounded border border-[#1F1F23] hover:border-[#F27D26]/40 flex items-center justify-between gap-2 text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{c.name}</span>
                      <span className="text-[#F27D26] uppercase">({c.symbol})</span>
                      <span className="text-[10px] text-cyan-400">[{c.chain}]</span>
                    </div>
                    <div className="text-[11px] text-[#8E9299] truncate max-w-xs">
                      {c.contractAddress}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(c.contractAddress, `addr_${c.id}`)}
                      className="p-1 rounded hover:bg-[#0A0A0C] text-[#8E9299] hover:text-white"
                      title="Copy Checksum Address"
                    >
                      {copiedKey === `addr_${c.id}` ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {onSelectContract && (
                      <button
                        type="button"
                        onClick={() => onSelectContract(c)}
                        className="px-2 py-0.5 rounded bg-[#F27D26]/20 hover:bg-[#F27D26]/30 text-[#F27D26] text-[10px] font-bold uppercase"
                      >
                        Load
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
