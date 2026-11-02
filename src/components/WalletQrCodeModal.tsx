import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft,
  ScanLine,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface WalletQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ethAddress: string;
  solanaAddress: string;
  activeNetwork?: "ethereum" | "solana";
  walletName?: string;
  walletIcon?: string;
  onOpenScanner?: () => void;
  unitPriceEth?: number;
  unitPriceSol?: number;
}

export const WalletQrCodeModal: React.FC<WalletQrCodeModalProps> = ({
  isOpen,
  onClose,
  ethAddress,
  solanaAddress,
  activeNetwork = "ethereum",
  walletName = "Universal Web3 Wallet",
  walletIcon = "🦊",
  onOpenScanner,
  unitPriceEth = 3425.8,
  unitPriceSol = 198.2,
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<"ethereum" | "solana">(activeNetwork);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [uriCopied, setUriCopied] = useState<boolean>(false);
  const [isAmountRequested, setIsAmountRequested] = useState<boolean>(false);
  const [requestedAmount, setRequestedAmount] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Sync initial network when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedNetwork(activeNetwork);
    }
  }, [isOpen, activeNetwork]);

  const activeAddress = selectedNetwork === "ethereum" ? ethAddress : solanaAddress;
  const currentSymbol = selectedNetwork === "ethereum" ? "ETH" : "SOL";
  const currentUnitPrice = selectedNetwork === "ethereum" ? unitPriceEth : unitPriceSol;

  // Build URI representation based on standard specifications
  const buildQrPayload = (): string => {
    if (!activeAddress) return "";
    const cleanAmount = parseFloat(requestedAmount);

    if (isAmountRequested && !isNaN(cleanAmount) && cleanAmount > 0) {
      if (selectedNetwork === "ethereum") {
        // EIP-681 standard URI for Ethereum requests
        return `ethereum:${activeAddress}?value=${cleanAmount}`;
      } else {
        // Solana Pay standard URI
        return `solana:${activeAddress}?amount=${cleanAmount}`;
      }
    }
    return activeAddress;
  };

  // Generate QR code data URL whenever address, network, or amount changes
  useEffect(() => {
    if (!isOpen || !activeAddress) return;

    const payload = buildQrPayload();
    QRCode.toDataURL(payload, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0F0F17",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        setQrDataUrl(url);
        setErrorMsg("");
      })
      .catch((err) => {
        console.error("QR Code Generation Error:", err);
        setErrorMsg("Failed to generate QR Code");
      });
  }, [isOpen, activeAddress, selectedNetwork, requestedAmount, isAmountRequested]);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUri = () => {
    const payload = buildQrPayload();
    navigator.clipboard.writeText(payload);
    setUriCopied(true);
    setTimeout(() => setUriCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `tokenworld-${selectedNetwork}-wallet-${activeAddress.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculatedUsd = parseFloat(requestedAmount) * currentUnitPrice;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wallet Address QR Code Generator"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[400px] bg-[#101018] border-2 border-[#26263A] rounded-2xl shadow-[0_25px_65px_-10px_rgba(0,0,0,0.9),0_0_35px_rgba(242,125,38,0.2)] flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="bg-[#141420] border-b border-[#232334] px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-sm shadow-inner">
              {walletIcon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white">Receive / QR Code</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedNetwork === "ethereum" ? "ERC-20" : "SPL"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{walletName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="px-2 py-1 rounded-lg bg-[#1D1D2C] hover:bg-[#27273C] border border-[#2E2E44] text-[11px] font-mono text-cyan-300 flex items-center gap-1 transition-colors"
                title="Open Camera Scanner to import an address"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#252538] transition-colors"
              title="Close QR Code Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto max-h-[82vh]">
          {/* Network Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#161622] border border-[#232334] rounded-xl text-xs font-mono select-none">
            <button
              type="button"
              onClick={() => setSelectedNetwork("ethereum")}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                selectedNetwork === "ethereum"
                  ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1E1E2C]"
              }`}
            >
              <span className="text-xs">Ξ</span>
              <span>Ethereum</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedNetwork("solana")}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                selectedNetwork === "solana"
                  ? "bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1E1E2C]"
              }`}
            >
              <span className="text-xs">◎</span>
              <span>Solana</span>
            </button>
          </div>

          {/* QR Code Presentation Box */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner relative group">
            {qrDataUrl ? (
              <div className="relative">
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${activeAddress}`}
                  className="w-56 h-56 rounded-lg block"
                />
                {/* Center Network Brand Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11 h-11 rounded-xl bg-[#0F0F17] border-2 border-white shadow-xl flex items-center justify-center text-base font-bold">
                    {selectedNetwork === "ethereum" ? (
                      <span className="text-blue-400">Ξ</span>
                    ) : (
                      <span className="text-purple-400">◎</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-800 font-mono text-xs">
                Generating QR code...
              </div>
            )}

            {isAmountRequested && parseFloat(requestedAmount) > 0 && (
              <div className="mt-2 text-center text-slate-800 text-xs font-mono font-semibold">
                Requesting: {requestedAmount} {currentSymbol} (~${calculatedUsd.toFixed(2)} USD)
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs font-mono text-red-400 text-center">{errorMsg}</p>
          )}

          {/* Address Display Bar */}
          <div className="bg-[#151522] border border-[#232336] rounded-xl p-2.5 space-y-1 font-mono">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="uppercase font-bold tracking-wider">
                {selectedNetwork === "ethereum" ? "Ethereum Public Address" : "Solana Public Address"}
              </span>
              <a
                href={
                  selectedNetwork === "ethereum"
                    ? `https://etherscan.io/address/${activeAddress}`
                    : `https://solscan.io/account/${activeAddress}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <span>Explorer</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="text-xs text-white font-mono break-all select-all leading-relaxed bg-[#0E0E15] p-2 rounded-lg border border-[#1E1E2C]">
              {activeAddress}
            </div>
          </div>

          {/* Collapsible Payment Request Section */}
          <div className="bg-[#151522] border border-[#232336] rounded-xl p-2.5 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Specify Request Amount (Optional)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAmountRequested(!isAmountRequested);
                  if (isAmountRequested) setRequestedAmount("");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  isAmountRequested
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-[#202030] text-slate-400 hover:text-slate-200"
                }`}
              >
                {isAmountRequested ? "Enabled" : "Add Amount"}
              </button>
            </div>

            {isAmountRequested && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(e.target.value)}
                      placeholder={`e.g. 0.5 ${currentSymbol}`}
                      className="w-full bg-[#0E0E15] border border-[#2A2A3E] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">
                      {currentSymbol}
                    </span>
                  </div>
                  {parseFloat(requestedAmount) > 0 && (
                    <span className="text-[11px] text-emerald-400 font-mono shrink-0">
                      ≈ ${calculatedUsd.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Encodes standard {selectedNetwork === "ethereum" ? "EIP-681" : "Solana Pay"} URI into the QR pattern.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1F1F30] hover:bg-[#28283E] border border-[#2D2D44] text-xs font-semibold text-slate-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1F1F30] hover:bg-[#28283E] border border-[#2D2D44] text-xs font-semibold text-slate-200 transition-colors"
              title="Download QR code image as PNG"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUri}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1F1F30] hover:bg-[#28283E] border border-[#2D2D44] text-xs font-semibold text-slate-200 transition-colors"
              title="Copy payment URI or address payload"
            >
              {uriCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Share URI</span>
                </>
              )}
            </button>
          </div>

          {/* Network Advisory / Safe Transfer Notice */}
          <div className="bg-[#14141E] border border-[#222230] rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-slate-400 font-mono">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 font-semibold">
                {selectedNetwork === "ethereum"
                  ? "Send Only Ethereum & ERC-20 Assets"
                  : "Send Only Solana & SPL Assets"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedNetwork === "ethereum"
                  ? "Transfers of non-EVM tokens to this address may result in unrecoverable asset loss. Compatible with Layer 2s (Arbitrum, Optimism, Base)."
                  : "This address accepts SOL and Solana Program Library tokens. Do not send native Ethereum or Bitcoin directly to this address."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
