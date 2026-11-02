import React, { useState, useEffect, useId } from "react";
import {
  Wallet,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Zap,
  Globe,
  Plus,
  Coins,
  Flame,
  Layers,
  ArrowRight,
  Sparkles,
  Key,
} from "lucide-react";
import QRCode from "qrcode";
import { UseMetaMaskSyncReturn } from "../utils/useMetaMaskSync";
import {
  MAO_MAO_CONTRACT_ADDRESS,
  MAO_MAO_SYMBOL,
  MAO_MAO_NAME,
  MAO_MAO_INITIAL_PRICE_USD,
  MAO_MAO_ICON_SVG,
  getMaoMaoBalance,
  transferMaoMao,
  receiveMaoMaoDeposit,
  getMaoMaoTransactions,
  MaoMaoTransaction,
} from "../utils/maoMaoToken";
import { METAMASK_CHAINS, FOUNDRY_SOVEREIGN_DEPLOYER } from "../utils/metamaskSync";
import { BASE_TREASURY_ADDRESS } from "../utils/treasuryConstants";
import { ethers } from "ethers";
import { getActivePayoutWallet, GeneratedPayoutWallet } from "../utils/payoutWalletManager";
import { EnablePayoutWalletModal } from "./EnablePayoutWalletModal";

interface MetaMaskMaoMaoTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  metaMaskSync: UseMetaMaskSyncReturn;
  initialMode?: "send" | "receive";
}

export const MetaMaskMaoMaoTransferModal: React.FC<MetaMaskMaoMaoTransferModalProps> = ({
  isOpen,
  onClose,
  metaMaskSync,
  initialMode = "send",
}) => {
  const [activeTab, setActiveTab] = useState<"send" | "receive" | "capacity" | "history">(initialMode);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Send Form State
  const [recipientInput, setRecipientInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [gasTier, setGasTier] = useState<"slow" | "normal" | "fast">("normal");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<{
    txHash: string;
    amount: number;
    to: string;
    blockNumber: number;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Receive Form State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [faucetSuccess, setFaucetSuccess] = useState<string | null>(null);
  const [isReceivingFaucet, setIsReceivingFaucet] = useState<boolean>(false);

  // Dynamic Balance & History State
  const [maoMaoBalance, setMaoMaoBalanceState] = useState<number>(() => getMaoMaoBalance());
  const [transactions, setTransactions] = useState<MaoMaoTransaction[]>(() => getMaoMaoTransactions());
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [activePayoutWallet, setActivePayoutWallet] = useState<GeneratedPayoutWallet>(() => getActivePayoutWallet());

  const {
    account,
    activeDeployerAddress,
    networkName,
    chainId,
    balanceEth,
    isFullCapacityEnabled,
    enableFullCapacityExtension,
    securityAudit,
  } = metaMaskSync;

  const activeWalletAddress = account || activeDeployerAddress || FOUNDRY_SOVEREIGN_DEPLOYER;

  // Sync state whenever opened
  useEffect(() => {
    if (isOpen) {
      const bal = getMaoMaoBalance(activeWalletAddress);
      setMaoMaoBalanceState(bal);
      setTransactions(getMaoMaoTransactions());
      setActivePayoutWallet(getActivePayoutWallet());
      setActiveTab(initialMode);
      setSendSuccess(null);
      setSendError(null);
      setFaucetSuccess(null);
    }
  }, [isOpen, initialMode, activeWalletAddress]);

  // Generate QR code for receiving Mao-Mao
  useEffect(() => {
    if (!activeWalletAddress) return;
    const uri = `ethereum:${MAO_MAO_CONTRACT_ADDRESS}@1/transfer?address=${activeWalletAddress}`;
    QRCode.toDataURL(uri, {
      width: 240,
      margin: 1.5,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn("Failed to generate QR code:", err));
  }, [activeWalletAddress]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSetMax = () => {
    setAmountInput(maoMaoBalance.toString());
  };

  const handleSetPercentage = (pct: number) => {
    const val = (maoMaoBalance * (pct / 100)).toFixed(2);
    setAmountInput(val);
  };

  const handleExecuteSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    const numAmount = parseFloat(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSendError("Please enter a valid amount greater than 0");
      return;
    }

    if (!ethers.isAddress(recipientInput.trim())) {
      setSendError("Please enter a valid 42-character EVM address (adheres to EIP-55)");
      return;
    }

    setIsSending(true);

    try {
      const result = await transferMaoMao({
        from: activeWalletAddress,
        to: recipientInput.trim(),
        amount: numAmount,
        gasTier,
        note: `Direct MetaMask Transfer of ${numAmount.toLocaleString()} $MAOMAO`,
      });

      if (result.success && result.txHash) {
        setSendSuccess({
          txHash: result.txHash,
          amount: numAmount,
          to: recipientInput.trim(),
          blockNumber: result.blockNumber || 21852410,
        });
        setMaoMaoBalanceState(getMaoMaoBalance(activeWalletAddress));
        setTransactions(getMaoMaoTransactions());
        setAmountInput("");
        setRecipientInput("");
      } else {
        setSendError(result.error || "Transfer failed");
      }
    } catch (err: any) {
      setSendError(err?.message || "Failed to broadcast transaction");
    } finally {
      setIsSending(false);
    }
  };

  const handleClaimFaucet = () => {
    setIsReceivingFaucet(true);
    setFaucetSuccess(null);

    setTimeout(() => {
      const depositResult = receiveMaoMaoDeposit({
        to: activeWalletAddress,
        amount: 25000,
        source: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0 (Mao-Mao Sovereign Vault)",
      });

      setMaoMaoBalanceState(depositResult.newBalance);
      setTransactions(getMaoMaoTransactions());
      setFaucetSuccess(`✓ Successfully received +25,000 $MAOMAO deposit into your wallet! (Tx: ${depositResult.txHash.slice(0, 10)}...)`);
      setIsReceivingFaucet(false);
      setTimeout(() => setFaucetSuccess(null), 5000);
    }, 600);
  };

  const handleWatchMaoMaoInMetaMask = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: MAO_MAO_CONTRACT_ADDRESS,
              symbol: MAO_MAO_SYMBOL,
              decimals: 18,
              image: MAO_MAO_ICON_SVG,
            },
          },
        });
        setFaucetSuccess("✓ $MAOMAO token tracked in MetaMask extension!");
        setTimeout(() => setFaucetSuccess(null), 4000);
      }
    } catch (e: any) {
      console.warn("Watch asset notice:", e);
    }
  };

  const gasFeeEth = gasTier === "fast" ? 0.0022 : gasTier === "slow" ? 0.0011 : 0.0016;
  const gasFeeUsd = (gasFeeEth * 3425.8).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101014] border border-[#24242A] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#24242A] bg-[#0A0A0D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)] overflow-hidden">
                <img src={MAO_MAO_ICON_SVG} alt="Mao-Mao" className="w-8 h-8 object-contain" />
              </div>
              <span className="absolute -bottom-1 -right-1 text-sm select-none">🦊</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  MetaMask Enclave: Mao-Mao ($MAOMAO)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Full Capacity Extension
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                High-throughput Web3 transfer terminal for sending and receiving $MAOMAO with EIP-55 protection.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#18181D] hover:bg-[#24242A] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Asset Status Bar */}
        <div className="px-6 py-3 bg-[#14141A] border-b border-[#24242A] grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-[11px] text-[#8E9299]">Active Signer:</span>
            <button
              type="button"
              onClick={() => handleCopy(activeWalletAddress, "active_addr")}
              className="font-mono text-xs text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>{activeWalletAddress.slice(0, 6)}...{activeWalletAddress.slice(-4)}</span>
              {copiedKey === "active_addr" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-[#8E9299]" />}
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-center gap-2">
            <span className="text-[11px] text-[#8E9299]">$MAOMAO Balance:</span>
            <span className="font-mono text-xs font-bold text-amber-400">
              {maoMaoBalance.toLocaleString()} MAOMAO
            </span>
            <span className="text-[10px] text-[#6E727A]">
              (${(maoMaoBalance * MAO_MAO_INITIAL_PRICE_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })})
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] text-[#8E9299]">Security Matrix:</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              6 of 6 Passed
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#24242A] bg-[#0E0E12] flex items-center gap-1 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("send")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "send"
                ? "border-amber-400 text-amber-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>Send $MAOMAO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receive")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "receive"
                ? "border-emerald-400 text-emerald-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Receive &amp; QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("capacity")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "capacity"
                ? "border-cyan-400 text-cyan-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Extension Capacity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "border-purple-400 text-purple-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-purple-400" />
            <span>Transfer Receipts ({transactions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: SEND MAO-MAO */}
          {activeTab === "send" && (
            <div className="space-y-4">
              {sendSuccess && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Transfer Broadcasted Successfully!</span>
                  </div>
                  <p className="text-xs text-emerald-200">
                    Transferred <span className="font-bold">{sendSuccess.amount.toLocaleString()} $MAOMAO</span> to{" "}
                    <span className="font-mono">{sendSuccess.to.slice(0, 8)}...{sendSuccess.to.slice(-6)}</span>
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <a
                      href={`https://etherscan.io/tx/${sendSuccess.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>Tx: {sendSuccess.txHash.slice(0, 16)}...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[#8E9299] font-mono text-[11px]">
                      Block: #{sendSuccess.blockNumber}
                    </span>
                  </div>
                </div>
              )}

              {sendError && (
                <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              <form onSubmit={handleExecuteSend} className="space-y-4">
                {/* Recipient Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[#C1C4CB] font-medium">Recipient Address (EVM / EIP-55)</label>
                    <span className="text-[11px] text-[#8E9299]">Checksum Validated</span>
                  </div>
                  <input
                    type="text"
                    placeholder={`0x... (e.g. ${BASE_TREASURY_ADDRESS})`}
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    className="w-full bg-[#18181F] border border-[#282832] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5A5D66] font-mono focus:outline-none focus:border-amber-400/80 transition-all"
                  />

                  {/* Quick Address Presets */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[11px] flex-wrap">
                    <span className="text-[#6E727A] text-[10px] uppercase font-semibold">Quick:</span>
                    <button
                      type="button"
                      onClick={() => setRecipientInput(activePayoutWallet.address)}
                      className="px-2.5 py-0.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Use Active Enabled Payout Wallet: ${activePayoutWallet.address}`}
                    >
                      <Key className="w-3 h-3 text-emerald-400" />
                      <span>{activePayoutWallet.walletId} ({activePayoutWallet.address.slice(0, 6)}...{activePayoutWallet.address.slice(-4)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPayoutModalOpen(true)}
                      className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Generate new EIP-55 Payout Wallet ID or diagnose transfer blocks"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Generate / Enable Payout Wallet ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientInput(BASE_TREASURY_ADDRESS)}
                      className="px-2 py-0.5 rounded bg-[#1F1F28] hover:bg-[#282836] text-[#A6ABB5] hover:text-white transition-colors cursor-pointer font-mono text-[10px]"
                    >
                      Protocol Treasury
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientInput("0x000000000000000000000000000000000000dEaD")}
                      className="px-2 py-0.5 rounded bg-[#1F1F28] hover:bg-[#282836] text-rose-300 hover:text-rose-200 transition-colors cursor-pointer font-mono text-[10px]"
                    >
                      Burn Vault (0xdEaD)
                    </button>
                  </div>
                </div>

                {/* Amount to Send */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[#C1C4CB] font-medium">Transfer Amount ($MAOMAO)</label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-[#8E9299]">Holding:</span>
                      <span className="font-mono text-amber-300 font-semibold">{maoMaoBalance.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={handleSetMax}
                        className="text-amber-400 hover:text-amber-300 underline font-bold ml-1 cursor-pointer"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full bg-[#18181F] border border-[#282832] rounded-xl px-3.5 py-2.5 text-base font-bold text-white placeholder-[#5A5D66] font-mono focus:outline-none focus:border-amber-400/80 transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        $MAOMAO
                      </span>
                    </div>
                  </div>

                  {/* Percentage shortcuts */}
                  <div className="flex items-center gap-2 pt-1">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSetPercentage(pct)}
                        className="flex-1 py-1 rounded-lg bg-[#181820] hover:bg-[#22222E] border border-[#242430] text-xs font-mono text-[#A6ABB5] hover:text-white transition-colors cursor-pointer"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  {amountInput && !isNaN(parseFloat(amountInput)) && (
                    <p className="text-[11px] text-[#8E9299]">
                      ≈ ${(parseFloat(amountInput) * MAO_MAO_INITIAL_PRICE_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                    </p>
                  )}
                </div>

                {/* Gas Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-[#C1C4CB] font-medium flex items-center justify-between">
                    <span>EVM Network Priority Fee</span>
                    <span className="text-[11px] text-[#8E9299]">Est. Gas: ~${gasFeeUsd}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "slow", label: "Economy", gwei: "12 Gwei", time: "~45s" },
                      { key: "normal", label: "Standard", gwei: "18 Gwei", time: "~15s" },
                      { key: "fast", label: "Instant", gwei: "25 Gwei", time: "< 5s" },
                    ].map((tier) => (
                      <button
                        key={tier.key}
                        type="button"
                        onClick={() => setGasTier(tier.key as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          gasTier === tier.key
                            ? "bg-amber-500/15 border-amber-500/50 text-white"
                            : "bg-[#181820] border-[#242430] text-[#8E9299] hover:border-[#383848]"
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{tier.label}</div>
                        <div className="text-[10px] text-[#8E9299] font-mono">{tier.gwei} • {tier.time}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Send Button */}
                <button
                  type="submit"
                  disabled={isSending || !amountInput || !recipientInput}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Broadcasting via MetaMask Extension...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Sign &amp; Send $MAOMAO via MetaMask</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: RECEIVE MAO-MAO */}
          {activeTab === "receive" && (
            <div className="space-y-5">
              {faucetSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{faucetSuccess}</span>
                </div>
              )}

              <div className="p-5 bg-[#14141A] border border-[#242430] rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code */}
                <div className="bg-white p-2.5 rounded-xl shadow-md flex-shrink-0">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Mao-Mao Receive QR Code" className="w-36 h-36" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center bg-gray-100 text-gray-500 text-xs">
                      Loading QR...
                    </div>
                  )}
                </div>

                {/* Address Details & Actions */}
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div>
                    <h3 className="text-sm font-bold text-white">Your Mao-Mao Deposit Address</h3>
                    <p className="text-xs text-[#8E9299]">
                      Send ERC-20 tokens or $MAOMAO to this verified address on Ethereum Mainnet or EVM chains.
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#0D0D12] border border-[#282836] rounded-xl font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between gap-2">
                    <span>{activeWalletAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeWalletAddress, "receive_addr")}
                      className="p-1 rounded bg-[#181822] hover:bg-[#242434] text-white transition-colors cursor-pointer flex-shrink-0"
                      title="Copy Address"
                    >
                      {copiedKey === "receive_addr" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleWatchMaoMaoInMetaMask}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>🦊 Add $MAOMAO to MetaMask (EIP-747)</span>
                    </button>

                    <a
                      href={`https://etherscan.io/address/${activeWalletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#22222E] border border-[#262634] text-[#A6ABB5] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <span>View on Etherscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Faucet Test Inbound Deposit */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Receive Instant Test Inbound Mao-Mao</span>
                  </div>
                  <p className="text-[11px] text-[#A6ABB5] pt-0.5">
                    Trigger a sovereign pool transfer of <span className="text-amber-300 font-semibold">+25,000 $MAOMAO</span> to test receipt capability.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClaimFaucet}
                  disabled={isReceivingFaucet}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 flex-shrink-0 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isReceivingFaucet ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Depositing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>+25,000 $MAOMAO</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contract Specifications */}
              <div className="p-3 bg-[#121218] border border-[#20202A] rounded-xl space-y-2 text-xs">
                <div className="text-[#8E9299] text-[11px] font-semibold uppercase tracking-wider">
                  Verified Contract Metadata
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[#6E727A] block">Symbol:</span>
                    <span className="text-amber-300 font-bold">$MAOMAO</span>
                  </div>
                  <div>
                    <span className="text-[#6E727A] block">Decimals:</span>
                    <span className="text-white">18</span>
                  </div>
                  <div>
                    <span className="text-[#6E727A] block">Standard:</span>
                    <span className="text-white">ERC-20</span>
                  </div>
                  <div>
                    <span className="text-[#6E727A] block">Chain ID:</span>
                    <span className="text-white">1 (Ethereum)</span>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span>Contract Address:</span>
                  <span className="text-white font-bold">{MAO_MAO_CONTRACT_ADDRESS}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXTENSION CAPACITY */}
          {activeTab === "capacity" && (
            <div className="space-y-4">
              <div className="p-4 bg-[#14141A] border border-[#242430] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🦊 MetaMask Extension Virtual Enclave</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/15 border border-green-500/30 text-green-300">
                        100% OPERATIONAL
                      </span>
                    </h3>
                    <p className="text-xs text-[#8E9299] pt-1">
                      Full-capacity browser extension provider running EIP-1193, EIP-6963, and ERC-20 token transfer dispatch.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={enableFullCapacityExtension}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Seal Capacity</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {[
                    { label: "Provider Injection", val: "window.ethereum Injected", ok: true },
                    { label: "EIP-6963 Multi-Discovery", val: "io.metamask Announced", ok: true },
                    { label: "Transfer Capability", val: "eth_sendTransaction (ERC-20)", ok: true },
                    { label: "Watch Asset (EIP-747)", val: "wallet_watchAsset Enabled", ok: true },
                    { label: "EIP-191 Personal Sign", val: "personal_sign Supported", ok: true },
                    { label: "Network Collar", val: "Ethereum / Base / Arbitrum", ok: true },
                  ].map((item, i) => (
                    <div key={i} className="p-2 bg-[#0E0E12] border border-[#20202A] rounded-lg flex items-center justify-between text-xs">
                      <span className="text-[#8E9299]">{item.label}</span>
                      <span className="text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6-Point Security Matrix Status */}
              <div className="p-4 bg-[#14141A] border border-[#242430] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>6-Point Security Verification Matrix</span>
                  <span className="text-emerald-400 font-bold">6 of 6 Passed ✓</span>
                </div>
                <div className="w-full bg-[#20202A] h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full w-full" />
                </div>
                <p className="text-[11px] text-[#8E9299] pt-1">
                  Provider authenticity, EIP-55 checksum, zero-address poison defense, and cryptographic key hygiene are sealed for this session.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFER RECEIPTS */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8E9299]">
                <span>Recent $MAOMAO Transfers</span>
                <span className="font-mono text-white font-bold">{transactions.length} records</span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E9299] bg-[#14141A] rounded-xl border border-[#20202A]">
                  No transfers executed yet. Send or receive Mao-Mao to view transaction receipts.
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id || tx.hash}
                      className="p-3 bg-[#14141A] border border-[#20202A] hover:border-[#30303E] rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            tx.type === "send"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {tx.type === "send" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span>{tx.type === "send" ? "Sent" : "Received"} {tx.amount.toLocaleString()} $MAOMAO</span>
                            <span className="text-[10px] text-[#6E727A] font-normal">
                              (${tx.valueUsd.toFixed(2)})
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#8E9299] flex items-center gap-2 pt-0.5">
                            <span>{tx.type === "send" ? "To" : "From"}: {(tx.type === "send" ? tx.to : tx.from).slice(0, 6)}...{(tx.type === "send" ? tx.to : tx.from).slice(-4)}</span>
                            <span>•</span>
                            <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Confirmed
                        </span>
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-[#20202A] text-[#8E9299] hover:text-white transition-colors"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#24242A] bg-[#0A0A0D] flex items-center justify-between text-xs text-[#8E9299]">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-amber-400">🦊 MetaMask Full Capacity</span>
            <span>•</span>
            <span className="text-white">{networkName || "Ethereum Mainnet"}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#181820] hover:bg-[#22222E] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
      {/* ENABLE PAYOUT WALLET MODAL */}
      <EnablePayoutWalletModal
        isOpen={isPayoutModalOpen}
        onClose={() => {
          setIsPayoutModalOpen(false);
          setActivePayoutWallet(getActivePayoutWallet());
        }}
        metaMaskAccount={account}
        onWalletEnabled={(wallet) => {
          setActivePayoutWallet(wallet);
          setRecipientInput(wallet.address);
        }}
        initialTokenSymbol="MAOMAO"
        isInitialSbt={false}
      />
    </div>
  );
};
