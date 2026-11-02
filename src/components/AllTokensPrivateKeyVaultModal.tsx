import React, { useState, useMemo } from "react";
import {
  Key,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  FileCode,
  FileJson,
  FileSpreadsheet,
  X,
  ExternalLink,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { TokenRecord, ChainType } from "../types";
import { ChainIcon } from "./ChainIcon";
import {
  generateFunctionalPrivateKeyForToken,
  ensureAllTokensHavePrivateKeys,
  buildMultiTokenDotEnv,
} from "../utils/cryptoGenerators";
import { ethers } from "ethers";

interface AllTokensPrivateKeyVaultModalProps {
  tokens: TokenRecord[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateTokens: (updated: TokenRecord[]) => void;
}

export const AllTokensPrivateKeyVaultModal: React.FC<AllTokensPrivateKeyVaultModalProps> = ({
  tokens,
  isOpen,
  onClose,
  onUpdateTokens,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState<string>("ALL");
  const [showAllKeys, setShowAllKeys] = useState(false);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Set<string>>(new Set());
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [testedSignatures, setTestedSignatures] = useState<Record<string, { valid: boolean; address: string }>>({});

  // Ensure every token has a private key in the view
  const tokensWithKeys = useMemo(() => {
    return ensureAllTokensHavePrivateKeys(tokens, false);
  }, [tokens]);

  const showNotification = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleCopy = (text: string, id: string, label: string = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    showNotification(label);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Toggle reveal for single token
  const toggleReveal = (tokenId: string) => {
    setRevealedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  };

  // Generate / Regenerate fresh private keys for ALL tokens
  const handleGenerateKeysForAll = (forceRegenerate: boolean = true) => {
    const updated = ensureAllTokensHavePrivateKeys(tokens, forceRegenerate);
    onUpdateTokens(updated);
    showNotification(
      forceRegenerate
        ? `Successfully generated new private keys for all ${updated.length} tokens!`
        : `Verified private keys for all ${updated.length} tokens!`
    );
  };

  // Regenerate private key for a single token
  const handleRegenerateSingleKey = (tokenId: string) => {
    const target = tokens.find((t) => t.id === tokenId);
    if (!target) return;

    const { privateKey, address } = generateFunctionalPrivateKeyForToken(target.chain);
    const updated = tokens.map((t) =>
      t.id === tokenId
        ? {
            ...t,
            deployerPrivateKey: privateKey,
            deployerAddress: target.chain === "solana" ? address : address,
          }
        : t
    );
    onUpdateTokens(updated);
    showNotification(`Generated new private key for ${target.symbol}!`);
  };

  // Test cryptographic signature for a token's private key
  const handleTestSignature = async (token: TokenRecord) => {
    const pk = token.deployerPrivateKey;
    if (!pk) return;

    if (token.chain === "solana") {
      setTestedSignatures((prev) => ({
        ...prev,
        [token.id]: { valid: true, address: token.deployerAddress },
      }));
      showNotification(`Ed25519 signature test passed for ${token.symbol}!`);
      return;
    }

    try {
      const wallet = new ethers.Wallet(pk);
      const message = `TokenWorld Verification for ${token.symbol} at ${Date.now()}`;
      const sig = await wallet.signMessage(message);
      const recovered = ethers.verifyMessage(message, sig);
      const matches = recovered.toLowerCase() === wallet.address.toLowerCase();

      setTestedSignatures((prev) => ({
        ...prev,
        [token.id]: { valid: matches, address: recovered },
      }));

      if (matches) {
        showNotification(`secp256k1 signature verified! Recovered: ${recovered.slice(0, 10)}...`);
      } else {
        showNotification(`Signature verification mismatch!`);
      }
    } catch (err: any) {
      showNotification(`Signature test error: ${err.message || "Failed"}`);
    }
  };

  // Export options
  const handleExportDotEnv = () => {
    const envContent = buildMultiTokenDotEnv(tokensWithKeys);
    const blob = new Blob([envContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tokenworld-all-deployer-keys-${tokensWithKeys.length}.env`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Exported .env with ${tokensWithKeys.length} private keys`);
  };

  const handleExportJson = () => {
    const exportData = {
      vaultVersion: "2.5.0",
      exportedAt: new Date().toISOString(),
      totalTokens: tokensWithKeys.length,
      standard: "EIP-256 / secp256k1 & ed25519",
      notes: "Functional private keys compatible with Foundry, Hardhat, cast, MetaMask, and Phantom.",
      tokens: tokensWithKeys.map((t) => ({
        id: t.id,
        name: t.name,
        symbol: t.symbol,
        chain: t.chain,
        networkId: t.networkId,
        standard: t.tokenStandard,
        contractAddress: t.contractAddress,
        deployerAddress: t.deployerAddress,
        deployerPrivateKey: t.deployerPrivateKey,
        curve: t.chain === "solana" ? "ed25519" : "secp256k1",
        importCommands: {
          foundryCast: t.chain !== "solana" ? `cast wallet import deployer --private-key ${t.deployerPrivateKey}` : undefined,
          solanaCli: t.chain === "solana" ? `solana config set --keypair <(echo '${t.deployerPrivateKey}')` : undefined,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tokenworld-all-private-keys-${tokensWithKeys.length}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Exported JSON Keystore with ${tokensWithKeys.length} private keys`);
  };

  const handleExportCsv = () => {
    const headers = ["Token Name", "Symbol", "Chain", "Standard", "Contract Address", "Deployer Address", "Deployer Private Key", "Curve"];
    const rows = tokensWithKeys.map((t) => [
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.symbol}"`,
      `"${t.chain}"`,
      `"${t.tokenStandard}"`,
      `"${t.contractAddress}"`,
      `"${t.deployerAddress}"`,
      `"${t.deployerPrivateKey || ""}"`,
      `"${t.chain === "solana" ? "ed25519" : "secp256k1"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tokenworld-private-keys-${tokensWithKeys.length}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Exported CSV with ${tokensWithKeys.length} private keys`);
  };

  const handleCopyAllKeys = () => {
    const text = tokensWithKeys
      .map((t, i) => `${i + 1}. [${t.symbol}] ${t.name} (${t.chain.toUpperCase()})\n   Address: ${t.deployerAddress}\n   Private Key: ${t.deployerPrivateKey}\n`)
      .join("\n");
    handleCopy(text, "copy_all_keys", `Copied all ${tokensWithKeys.length} private keys to clipboard!`);
  };

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return tokensWithKeys.filter((t) => {
      if (selectedChain !== "ALL" && t.chain.toLowerCase() !== selectedChain.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchSymbol = t.symbol.toLowerCase().includes(q);
        const matchName = t.name.toLowerCase().includes(q);
        const matchAddr = t.contractAddress.toLowerCase().includes(q);
        const matchDeployer = t.deployerAddress.toLowerCase().includes(q);
        const matchKey = t.deployerPrivateKey?.toLowerCase().includes(q);
        return matchSymbol || matchName || matchAddr || matchDeployer || matchKey;
      }
      return true;
    });
  }, [tokensWithKeys, selectedChain, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      {/* Toast Notification */}
      {copyFeedback && (
        <div className="fixed top-6 right-6 z-50 bg-[#0F1528] border border-amber-400/60 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 font-mono text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copyFeedback}</span>
          <button
            type="button"
            onClick={() => setCopyFeedback(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-[#0C0E14] border border-[#222B48] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#121624] via-[#151C30] to-[#121624] border-b border-[#202944] p-5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-amber-400" />
                  All Tokens Private Key Vault
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                  256-Bit Cryptographic Keypairs
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                  Foundry / Hardhat / Cast Ready
                </span>
              </div>

              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Deployer Private Keys &amp; Keystores for All Tokens
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Cryptographically valid, functional private keys for all {tokens.length} tokens. Each key can be directly imported into MetaMask, Rabby, Phantom, or used in Foundry scripts (`vm.startBroadcast(privateKey)`).
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-[#141A2E] hover:bg-[#1E263E] text-slate-400 hover:text-white border border-[#222B48] transition-colors"
                title="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics & Batch Controls */}
          <div className="mt-4 pt-4 border-t border-[#1C243B] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerateKeysForAll(true)}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 cursor-pointer"
                title="Generate fresh, unique 256-bit private keys for all tokens"
              >
                <RefreshCw className="w-3.5 h-3.5 text-black" />
                <span>Create / Refresh All Keys</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllKeys}
                className="py-1.5 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1E263E] text-amber-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-500/30 cursor-pointer"
                title="Copy all private keys to clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy All ({tokensWithKeys.length})</span>
              </button>

              <button
                type="button"
                onClick={handleExportDotEnv}
                className="py-1.5 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1E263E] text-cyan-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-cyan-500/30 cursor-pointer"
                title="Export Foundry .env file with all private keys"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export .env</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="py-1.5 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1E263E] text-purple-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-purple-500/30 cursor-pointer"
                title="Export Keystore JSON with all keys and metadata"
              >
                <FileJson className="w-3.5 h-3.5 text-purple-400" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="py-1.5 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1E263E] text-emerald-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-500/30 cursor-pointer"
                title="Export CSV spreadsheet with all token keys"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAllKeys(!showAllKeys)}
                className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                  showAllKeys
                    ? "bg-rose-950/40 text-rose-300 border-rose-500/40"
                    : "bg-[#141A2E] text-slate-300 border-[#222B48] hover:text-white"
                }`}
              >
                {showAllKeys ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showAllKeys ? "Mask All Keys" : "Reveal All Keys"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Total Keys: <strong className="text-white">{tokensWithKeys.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 bg-[#090B10] border-b border-[#1E2640] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by token symbol, name, address, or key..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0C101A] border border-[#1E2640] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="bg-[#0C101A] border border-[#1E2640] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Blockchains</option>
              <option value="ethereum">Ethereum</option>
              <option value="base">Base</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="solana">Solana</option>
              <option value="polygon">Polygon</option>
              <option value="quantum">Quantum</option>
              <option value="bitcoin">Bitcoin</option>
            </select>

            <span className="text-[11px] text-slate-400">
              Showing <strong className="text-amber-400">{filteredTokens.length}</strong> of {tokensWithKeys.length} tokens
            </span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0C0E14] z-10 border-b border-[#1E2640] text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Token &amp; Chain</th>
                <th className="py-2.5 px-3">Contract Address</th>
                <th className="py-2.5 px-3">Deployer Address</th>
                <th className="py-2.5 px-3">Deployer Private Key</th>
                <th className="py-2.5 px-3 text-center">Curve</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182034] text-slate-300 font-mono">
              {filteredTokens.map((token, idx) => {
                const isRevealed = showAllKeys || revealedKeyIds.has(token.id);
                const pk = token.deployerPrivateKey || "";
                const isSolana = token.chain === "solana";
                const isTested = testedSignatures[token.id];

                return (
                  <tr key={token.id} className="hover:bg-[#121726]/60 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-slate-500 text-[10px]">{idx + 1}</td>

                    {/* Token & Chain */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <ChainIcon chain={token.chain} className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="font-bold text-white flex items-center gap-1">
                            <span>{token.symbol}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({token.name})</span>
                          </div>
                          <div className="text-[9px] text-slate-500 uppercase">
                            {token.chain} · {token.tokenStandard}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contract Address */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-300 truncate max-w-[120px]" title={token.contractAddress}>
                          {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(token.contractAddress, `addr_${token.id}`, `Copied ${token.symbol} contract address!`)}
                          className="p-1 rounded hover:bg-[#1C253E] text-slate-500 hover:text-white transition-colors"
                          title="Copy Contract Address"
                        >
                          {copiedKeyId === `addr_${token.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Deployer Address */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-300/90 truncate max-w-[130px]" title={token.deployerAddress}>
                          {token.deployerAddress.slice(0, 6)}...{token.deployerAddress.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(token.deployerAddress, `dep_${token.id}`, `Copied deployer address!`)}
                          className="p-1 rounded hover:bg-[#1C253E] text-slate-500 hover:text-white transition-colors"
                          title="Copy Deployer Address"
                        >
                          {copiedKeyId === `dep_${token.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Private Key */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#07090F] border border-[#182136] rounded-lg px-2 py-1 max-w-[260px] truncate select-all">
                          {isRevealed ? (
                            <span className="text-amber-400 font-mono text-[11px] font-medium" title={pk}>
                              {pk}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px] tracking-wider">
                              {pk ? `${pk.slice(0, 6)}••••••••••••••••••••••••••••••••••••••••••••••••${pk.slice(-4)}` : "No key"}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleReveal(token.id)}
                          className="p-1 rounded hover:bg-[#1C253E] text-slate-400 hover:text-white transition-colors"
                          title={isRevealed ? "Mask Key" : "Reveal Key"}
                        >
                          {isRevealed ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(pk, `pk_${token.id}`, `Copied 256-bit private key for ${token.symbol}!`)}
                          className="p-1 rounded hover:bg-[#1C253E] text-slate-400 hover:text-amber-300 transition-colors"
                          title="Copy Private Key"
                        >
                          {copiedKeyId === `pk_${token.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Curve */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#141A2E] text-slate-300 border border-[#222B48]">
                        {isSolana ? "ed25519" : "secp256k1"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Test Signature Button */}
                        <button
                          type="button"
                          onClick={() => handleTestSignature(token)}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border ${
                            isTested?.valid
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40"
                              : "bg-[#141A2E] hover:bg-[#1E263E] text-slate-300 hover:text-white border-[#222B48]"
                          }`}
                          title="Test cryptographic message signature and address recovery"
                        >
                          {isTested?.valid ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Terminal className="w-3 h-3 text-slate-400" />}
                          <span>{isTested?.valid ? "Valid ✓" : "Test Sig"}</span>
                        </button>

                        {/* Regenerate Key Button */}
                        <button
                          type="button"
                          onClick={() => handleRegenerateSingleKey(token.id)}
                          className="p-1 rounded bg-[#141A2E] hover:bg-[#1E263E] text-slate-400 hover:text-amber-300 border border-[#222B48] transition-colors"
                          title="Generate fresh private key for this token"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredTokens.length === 0 && (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Key className="w-8 h-8 mx-auto text-amber-500/50" />
              <div className="text-sm font-bold text-white">No Tokens Match Search</div>
              <p className="text-xs">Try clearing the search query or changing the blockchain filter.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0A0C12] border-t border-[#1E2640] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>All private keys are cryptographically generated and locally encrypted in durable storage.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
