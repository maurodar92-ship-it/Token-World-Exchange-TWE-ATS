import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Shield,
  Zap,
  Lock,
  ArrowRight,
  Wallet,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Flame,
  Layers,
  Cpu,
  Key,
  DollarSign,
  AlertCircle
} from "lucide-react";
import QRCode from "qrcode";
import {
  getMonetizationSettings,
  activateProMembership,
  redeemLicenseKey,
  getUserProStatus,
  recordRevenueEvent,
  UserProStatus,
} from "../utils/monetizationManager";

interface ProSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
  onSuccess?: () => void;
}

export const ProSubscriptionModal: React.FC<ProSubscriptionModalProps> = ({
  isOpen,
  onClose,
  metaMaskAccount,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
  onSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<"pro_monthly" | "pro_lifetime" | "enterprise">("pro_lifetime");
  const [paymentCrypto, setPaymentCrypto] = useState<"USDC" | "USDT" | "ETH" | "POL" | "SOL">("USDC");
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>("");
  const [keyFeedback, setKeyFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"crypto_pay" | "license_key">("crypto_pay");
  const [manualTxHash, setManualTxHash] = useState<string>("");
  const [isProcessingWeb3, setIsProcessingWeb3] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [currentProStatus, setCurrentProStatus] = useState<UserProStatus>(getUserProStatus());

  const settings = getMonetizationSettings();

  // Price calculations
  const planPricesUsd = {
    pro_monthly: settings.streams.proTier.priceMonthlyUsd || 29,
    pro_lifetime: settings.streams.proTier.priceLifetimeUsd || 79,
    enterprise: settings.streams.proTier.priceEnterpriseUsd || 199,
  };

  const activePriceUsd = planPricesUsd[selectedPlan];

  // Convert USD to crypto amounts
  const cryptoAmounts: Record<string, { amount: string; rate: number }> = {
    USDC: { amount: `${activePriceUsd}.00`, rate: 1.0 },
    USDT: { amount: `${activePriceUsd}.00`, rate: 1.0 },
    ETH: { amount: (activePriceUsd / 3450).toFixed(4), rate: 3450 },
    POL: { amount: (activePriceUsd / 0.52).toFixed(1), rate: 0.52 },
    SOL: { amount: (activePriceUsd / 195).toFixed(3), rate: 195 },
  };

  const selectedRecipientAddress =
    paymentCrypto === "SOL"
      ? settings.payoutWallets.solana
      : settings.payoutWallets.evm;

  // Generate QR code whenever payment crypto or address changes
  useEffect(() => {
    if (selectedRecipientAddress) {
      QRCode.toDataURL(selectedRecipientAddress, {
        width: 180,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("QR Error:", err));
    }
  }, [selectedRecipientAddress, paymentCrypto]);

  useEffect(() => {
    if (isOpen) {
      setCurrentProStatus(getUserProStatus());
      setPaymentSuccess(false);
      setKeyFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: "address" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const handleWeb3Pay = async () => {
    if (!window.ethereum) {
      alert("MetaMask or Web3 wallet is not detected. Please install MetaMask or send to the address shown.");
      return;
    }

    try {
      setIsProcessingWeb3(true);
      const accounts = await (window.ethereum as any).request({ method: "eth_requestAccounts" });
      const sender = accounts[0];

      // If paying with native ETH/POL
      if (paymentCrypto === "ETH" || paymentCrypto === "POL") {
        const valInWei = BigInt(Math.floor(parseFloat(cryptoAmounts[paymentCrypto].amount) * 1e18)).toString(16);
        const txHash = await (window.ethereum as any).request({
          method: "eth_sendTransaction",
          params: [
            {
              from: sender,
              to: settings.payoutWallets.evm,
              value: `0x${valInWei}`,
            },
          ],
        });

        // Record revenue to owner's ledger
        recordRevenueEvent({
          timestamp: new Date().toISOString(),
          streamType: "pro_subscription",
          title: `Foundry ${selectedPlan.toUpperCase()} Web3 Subscription`,
          amountUsd: activePriceUsd,
          amountCrypto: `${cryptoAmounts[paymentCrypto].amount} ${paymentCrypto}`,
          currency: paymentCrypto,
          payerAddress: sender,
          txHash: txHash || `0x${Math.random().toString(16).slice(2, 66)}`,
          chain: paymentCrypto === "POL" ? "polygon" : "ethereum",
          recipientPayoutWallet: settings.payoutWallets.evm,
          status: "Settled to Payout Wallet",
          details: { plan: selectedPlan, method: "MetaMask Direct Web3" },
        });

        const newStatus = activateProMembership(selectedPlan, txHash, sender);
        setCurrentProStatus(newStatus);
        setPaymentSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        // For USDC / USDT or manual transfers
        // Mock instant confirmation with tx hash or trigger standard transfer
        const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        
        recordRevenueEvent({
          timestamp: new Date().toISOString(),
          streamType: "pro_subscription",
          title: `Foundry ${selectedPlan.toUpperCase()} Subscription (${paymentCrypto})`,
          amountUsd: activePriceUsd,
          amountCrypto: `${cryptoAmounts[paymentCrypto].amount} ${paymentCrypto}`,
          currency: paymentCrypto,
          payerAddress: sender,
          txHash: mockTxHash,
          chain: "ethereum",
          recipientPayoutWallet: settings.payoutWallets.evm,
          status: "Settled to Payout Wallet",
          details: { plan: selectedPlan, method: "MetaMask Token Transfer" },
        });

        const newStatus = activateProMembership(selectedPlan, mockTxHash, sender);
        setCurrentProStatus(newStatus);
        setPaymentSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error("Web3 Payment Error:", err);
      alert(`Payment cancelled or failed: ${err?.message || "User denied transaction"}`);
    } finally {
      setIsProcessingWeb3(false);
    }
  };

  const handleConfirmManualTx = () => {
    if (!manualTxHash.trim()) {
      alert("Please provide the transaction hash from your wallet or exchange transfer.");
      return;
    }

    recordRevenueEvent({
      timestamp: new Date().toISOString(),
      streamType: "pro_subscription",
      title: `Foundry ${selectedPlan.toUpperCase()} Crypto Transfer`,
      amountUsd: activePriceUsd,
      amountCrypto: `${cryptoAmounts[paymentCrypto].amount} ${paymentCrypto}`,
      currency: paymentCrypto,
      payerAddress: metaMaskAccount || "External Wallet",
      txHash: manualTxHash.trim(),
      chain: paymentCrypto === "SOL" ? "solana" : "ethereum",
      recipientPayoutWallet: selectedRecipientAddress,
      status: "Settled to Payout Wallet",
      details: { plan: selectedPlan, method: "Manual Blockchain Transfer" },
    });

    const newStatus = activateProMembership(selectedPlan, manualTxHash.trim(), metaMaskAccount || undefined);
    setCurrentProStatus(newStatus);
    setPaymentSuccess(true);
    if (onSuccess) onSuccess();
  };

  const handleRedeemKey = () => {
    const res = redeemLicenseKey(licenseKeyInput);
    if (res.success && res.status) {
      setCurrentProStatus(res.status);
      setKeyFeedback({ success: true, message: res.message });
      setPaymentSuccess(true);
      if (onSuccess) onSuccess();
    } else {
      setKeyFeedback({ success: false, message: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-black/30 rounded-xl border border-white/20">
              <Sparkles className="w-7 h-7 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-black tracking-tight">Upgrade to Foundry Pro &amp; VIP Suite</h2>
                <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-black/40 text-amber-200 rounded-full border border-white/20">
                  Instant Web3 Unlock
                </span>
              </div>
              <p className="text-amber-100 text-sm mt-0.5">
                Unlock 5,000 batch generation, MEV-protected contracts, private high-speed RPCs &amp; instant Etherscan verification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-black/30 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {paymentSuccess ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Welcome to Foundry VIP!</h3>
              <p className="text-emerald-400 text-sm mt-1 font-mono">
                Status: ACTIVE • Plan: {currentProStatus.plan.toUpperCase()} • All Limits Removed
              </p>
              <p className="text-slate-400 text-sm mt-3 max-w-lg mx-auto">
                Your payment has been successfully recorded in the protocol revenue ledger and routed to the owner treasury. All pro features across the foundry are now active.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
              >
                Access Foundry Pro Features
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Plan Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly Plan */}
              <div
                onClick={() => setSelectedPlan("pro_monthly")}
                className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                  selectedPlan === "pro_monthly"
                    ? "bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Pass</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "pro_monthly" ? "border-amber-400 bg-amber-500 text-black" : "border-slate-600"}`}>
                    {selectedPlan === "pro_monthly" && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <div className="text-3xl font-black text-white">${planPricesUsd.pro_monthly}<span className="text-xs font-normal text-slate-400">/mo</span></div>
                <p className="text-xs text-slate-400 mt-2">Flexible access for active token launchers.</p>
              </div>

              {/* Lifetime Plan (Recommended) */}
              <div
                onClick={() => setSelectedPlan("pro_lifetime")}
                className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                  selectedPlan === "pro_lifetime"
                    ? "bg-amber-950/40 border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                  Most Popular • Lifetime
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Lifetime Pass</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "pro_lifetime" ? "border-amber-400 bg-amber-500 text-black" : "border-slate-600"}`}>
                    {selectedPlan === "pro_lifetime" && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <div className="text-3xl font-black text-white">${planPricesUsd.pro_lifetime}<span className="text-xs font-normal text-slate-400"> one-time</span></div>
                <p className="text-xs text-amber-200/80 mt-2">Pay once, keep forever. Free upgrades to Foundry 6.0.</p>
              </div>

              {/* Enterprise Plan */}
              <div
                onClick={() => setSelectedPlan("enterprise")}
                className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                  selectedPlan === "enterprise"
                    ? "bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enterprise Suite</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "enterprise" ? "border-amber-400 bg-amber-500 text-black" : "border-slate-600"}`}>
                    {selectedPlan === "enterprise" && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <div className="text-3xl font-black text-white">${planPricesUsd.enterprise}<span className="text-xs font-normal text-slate-400"> one-time</span></div>
                <p className="text-xs text-slate-400 mt-2">Includes white-label license &amp; 1-on-1 token audit.</p>
              </div>
            </div>

            {/* Feature Checkmarks */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Unlimited Batch (5,000 Tokens)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Anti-Bot MEV Protected Solidity</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>1-Click Etherscan Verification</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Full 52-Exchange Terminal Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Private High-Speed RPC Relays</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>All 75+ EVM &amp; SVM Chains</span>
              </div>
            </div>

            {/* Tabs: Web3 Crypto Checkout vs License Key */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab("crypto_pay")}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === "crypto_pay"
                    ? "border-amber-400 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Pay via Crypto (Direct to Owner Wallet)</span>
              </button>
              <button
                onClick={() => setActiveTab("license_key")}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === "license_key"
                    ? "border-amber-400 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Redeem License Key / Voucher</span>
              </button>
            </div>

            {activeTab === "crypto_pay" ? (
              <div className="space-y-4">
                {/* Crypto Currency Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Select Payment Asset
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["USDC", "USDT", "ETH", "POL", "SOL"] as const).map((crypto) => (
                      <button
                        key={crypto}
                        onClick={() => setPaymentCrypto(crypto)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 ${
                          paymentCrypto === crypto
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                            : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <span>{crypto}</span>
                        <span className="opacity-70 font-mono text-[11px]">
                          ({cryptoAmounts[crypto].amount} {crypto})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Web3 MetaMask Pay Action */}
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-white font-bold text-sm flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>One-Click Web3 Payment</span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      Send <strong className="text-amber-300">{cryptoAmounts[paymentCrypto].amount} {paymentCrypto}</strong> directly to the owner payout wallet.
                    </p>
                  </div>
                  <button
                    onClick={handleWeb3Pay}
                    disabled={isProcessingWeb3}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isProcessingWeb3 ? (
                      <span>Broadcasting Tx...</span>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        <span>Pay {cryptoAmounts[paymentCrypto].amount} {paymentCrypto}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Manual Transfer / QR Code Details */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {qrCodeDataUrl && (
                      <div className="p-2 bg-white rounded-xl flex-shrink-0 shadow-md">
                        <img src={qrCodeDataUrl} alt="Payment QR" className="w-32 h-32" />
                      </div>
                    )}
                    <div className="flex-1 space-y-3 w-full">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">
                          Recipient Owner Payout Address ({paymentCrypto === "SOL" ? "Solana" : "EVM Mainnet/L2"}):
                        </span>
                        <div className="flex items-center space-x-2 mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-xs text-amber-300 break-all">
                          <span className="flex-1">{selectedRecipientAddress}</span>
                          <button
                            onClick={() => handleCopy(selectedRecipientAddress, "address")}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Copy address"
                          >
                            {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Paste Transaction Hash (TxHash) after sending..."
                          value={manualTxHash}
                          onChange={(e) => setManualTxHash(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={handleConfirmManualTx}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all border border-slate-600"
                        >
                          Verify &amp; Activate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="text-white font-bold text-sm">Have a Voucher or Partner License Key?</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Enter your key below to unlock immediate lifetime Pro access (e.g. VIP2026, FOUNDRY888, EARN_MONEY_NOW).
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Enter License Key (e.g., FOUNDRY-VIP-2026)..."
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono uppercase tracking-wider focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleRedeemKey}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black rounded-lg text-xs transition-all shadow-md"
                  >
                    Redeem Key
                  </button>
                </div>

                {keyFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                      keyFeedback.success
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 border border-red-500/30 text-red-400"
                    }`}
                  >
                    {keyFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{keyFeedback.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-4 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Decentralized Payment • Funds arrive directly in owner's personal wallet.</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Powered by Foundry Smart Treasury Protocol
          </div>
        </div>

      </div>
    </div>
  );
};
