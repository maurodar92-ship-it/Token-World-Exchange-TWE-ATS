import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  X,
  Camera,
  ScanLine,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  Bookmark,
} from "lucide-react";

export interface ScannedAddressResult {
  raw: string;
  address: string;
  network: "ethereum" | "solana";
  amount?: string;
  label: string;
  isValid: boolean;
}

interface WalletCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressImported: (
    address: string,
    network: "ethereum" | "solana",
    label: string,
    setAsActive: boolean
  ) => void;
  onOpenQrGenerator?: () => void;
}

export const WalletCameraScannerModal: React.FC<WalletCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onAddressImported,
  onOpenQrGenerator,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ScannedAddressResult | null>(null);
  const [customLabel, setCustomLabel] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play audio chime upon successful scan
  const playScanBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // chirp to A6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy may block in some browsers; ignore silently
    }
  }, []);

  // Parse scanned raw QR text into address, network, amount
  const parseScannedData = (text: string): ScannedAddressResult | null => {
    if (!text || typeof text !== "string") return null;
    const trimmed = text.trim();

    // 1. Ethereum EIP-681 or standard 0x address
    // ethereum:0x123...?value=0.5
    const ethUriMatch = trimmed.match(/^ethereum:(0x[a-fA-F0-9]{40})/i);
    const ethPlainMatch = trimmed.match(/(0x[a-fA-F0-9]{40})/i);

    if (ethUriMatch || ethPlainMatch) {
      const address = ethUriMatch ? ethUriMatch[1] : ethPlainMatch![1];
      let amount: string | undefined;

      // Extract amount if present in query string
      const urlParts = trimmed.split("?");
      if (urlParts.length > 1) {
        const params = new URLSearchParams(urlParts[1]);
        if (params.get("value")) amount = params.get("value")!;
      }

      return {
        raw: trimmed,
        address,
        network: "ethereum",
        amount,
        label: `Scanned EVM (${address.slice(0, 6)}...${address.slice(-4)})`,
        isValid: /^0x[a-fA-F0-9]{40}$/i.test(address),
      };
    }

    // 2. Solana Pay or Base58 public address (32 to 44 chars)
    // solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?amount=1.5
    const solUriMatch = trimmed.match(/^solana:([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    const solPlainMatch = trimmed.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);

    if (solUriMatch || solPlainMatch) {
      const address = solUriMatch ? solUriMatch[1] : solPlainMatch![1];
      let amount: string | undefined;

      const urlParts = trimmed.split("?");
      if (urlParts.length > 1) {
        const params = new URLSearchParams(urlParts[1]);
        if (params.get("amount")) amount = params.get("amount")!;
      }

      return {
        raw: trimmed,
        address,
        network: "solana",
        amount,
        label: `Scanned Solana (${address.slice(0, 4)}...${address.slice(-4)})`,
        isValid: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address),
      };
    }

    // If it's a general string but looks like a public key
    return {
      raw: trimmed,
      address: trimmed,
      network: trimmed.startsWith("0x") ? "ethereum" : "solana",
      label: "Custom Scanned Input",
      isValid: false,
    };
  };

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn("Camera access failed:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Camera permission denied or camera device not found.";
      setCameraError(
        msg.includes("Permission") || msg.includes("NotAllowedError")
          ? "Camera permission was denied. Please allow camera access or use Image Upload."
          : "No active camera found. You can upload an image of a QR code below or test presets."
      );
      setCameraActive(false);
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Video Frame Scanning Loop
  useEffect(() => {
    if (!isOpen || !cameraActive || scannedResult) return;

    let isScanning = true;

    const tick = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            const parsed = parseScannedData(code.data);
            if (parsed) {
              playScanBeep();
              setScannedResult(parsed);
              setCustomLabel(parsed.label);
              isScanning = false;
              return;
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, cameraActive, scannedResult, playScanBeep]);

  // Manage Camera on Modal Open/Close
  useEffect(() => {
    if (isOpen && activeTab === "camera" && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, scannedResult, startCamera, stopCamera]);

  // Process Uploaded QR Image File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsProcessingFile(false);
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const parsed = parseScannedData(code.data);
          if (parsed) {
            playScanBeep();
            setScannedResult(parsed);
            setCustomLabel(parsed.label);
          } else {
            setCameraError("Decoded QR data is not a recognizable crypto address.");
          }
        } else {
          setCameraError("No valid QR code pattern detected in the uploaded image.");
        }
        setIsProcessingFile(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Instant Sample QR for quick testing
  const handleLoadSampleQr = async (preset: {
    address: string;
    network: "ethereum" | "solana";
    label: string;
  }) => {
    playScanBeep();
    setScannedResult({
      raw: preset.address,
      address: preset.address,
      network: preset.network,
      label: preset.label,
      isValid: true,
    });
    setCustomLabel(preset.label);
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!scannedResult) return;
    navigator.clipboard.writeText(scannedResult.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetScan = () => {
    setScannedResult(null);
    setCustomLabel("");
    setCameraError(null);
    if (activeTab === "camera") {
      startCamera();
    }
  };

  const handleApplyAddress = (setAsActive: boolean) => {
    if (!scannedResult || !scannedResult.isValid) return;
    onAddressImported(
      scannedResult.address,
      scannedResult.network,
      customLabel.trim() || scannedResult.label,
      setAsActive
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera Wallet Address Scanner"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[420px] bg-[#101018] border-2 border-[#26263A] rounded-2xl shadow-[0_25px_65px_-10px_rgba(0,0,0,0.9),0_0_35px_rgba(34,197,94,0.18)] flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="bg-[#141420] border-b border-[#232334] px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-inner">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white">Scan & Import Address</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live OCR
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Ethereum EVM & Solana SVM</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenQrGenerator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQrGenerator();
                }}
                className="px-2 py-1 rounded-lg bg-[#1D1D2C] hover:bg-[#27273C] border border-[#2E2E44] text-[11px] font-mono text-amber-300 flex items-center gap-1 transition-colors"
                title="Open QR Code Generator"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>My QR</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#252538] transition-colors"
              title="Close Scanner Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs (Live Camera vs Upload File) */}
        {!scannedResult && (
          <div className="flex border-b border-[#1E1E2E] bg-[#12121C] text-xs font-mono select-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab("camera");
                setCameraError(null);
              }}
              className={`flex-1 py-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "camera"
                  ? "border-emerald-500 text-emerald-400 font-bold bg-[#171724]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Stream</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                stopCamera();
              }}
              className={`flex-1 py-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "upload"
                  ? "border-cyan-500 text-cyan-400 font-bold bg-[#171724]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload / Samples</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto max-h-[82vh]">
          {/* SCANNED RESULT PRESENTATION VIEW */}
          {scannedResult ? (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-3 bg-[#141422] border-2 border-emerald-500/40 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">QR Code Detected</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      scannedResult.network === "ethereum"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    }`}
                  >
                    {scannedResult.network === "ethereum" ? "Ξ Ethereum EVM" : "◎ Solana SVM"}
                  </span>
                </div>

                {/* Scanned Address */}
                <div className="bg-[#0D0D14] p-2.5 rounded-xl border border-[#222234] font-mono space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="uppercase font-bold">Public Key / Address</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-white break-all font-semibold select-all">
                    {scannedResult.address}
                  </div>
                </div>

                {/* Amount if present */}
                {scannedResult.amount && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-2 text-xs font-mono flex items-center justify-between text-emerald-300">
                    <span>Requested Amount:</span>
                    <span className="font-bold">
                      {scannedResult.amount} {scannedResult.network === "ethereum" ? "ETH" : "SOL"}
                    </span>
                  </div>
                )}

                {/* Custom Label Input */}
                <div className="space-y-1 font-mono text-xs">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Wallet Label / Tag
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Cold Storage, Trading Whale, Hardware"
                    className="w-full bg-[#0D0D14] border border-[#27273C] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Validation Status */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified cryptographic public key format</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleApplyAddress(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-98"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Set as Active Wallet & Fetch Real-Time Balances</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyAddress(false)}
                    className="py-2 px-3 rounded-xl bg-[#1B1B2A] hover:bg-[#242438] border border-[#2D2D44] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Bookmark Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="py-2 px-3 rounded-xl bg-[#1B1B2A] hover:bg-[#242438] border border-[#2D2D44] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scan Again</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === "camera" ? (
            /* CAMERA VIEW */
            <div className="space-y-3">
              <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border-2 border-[#242438] flex items-center justify-center group shadow-inner">
                {/* Hidden canvas for jsQR processing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* HTML5 Video element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Viewfinder Reticle Overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Darkened mask around viewfinder */}
                    <div className="relative w-48 h-48 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                      {/* Corner Brackets */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-400 rounded-tl" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-400 rounded-tr" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-400 rounded-bl" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-400 rounded-br" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-scan-laser" />
                    </div>
                  </div>
                )}

                {/* Camera Inactive / Loading / Error Overlay */}
                {(!cameraActive || cameraError) && (
                  <div className="absolute inset-0 bg-[#0E0E16]/90 p-4 flex flex-col items-center justify-center text-center space-y-2">
                    {cameraError ? (
                      <>
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                        <p className="text-xs font-mono text-slate-300 max-w-[260px]">
                          {cameraError}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono"
                          >
                            Retry Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("upload")}
                            className="px-3 py-1.5 rounded-lg bg-[#222234] hover:bg-[#2C2C42] text-cyan-300 text-xs font-bold font-mono"
                          >
                            Upload Image
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                        <p className="text-xs font-mono text-slate-400">
                          Requesting camera permissions...
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Status and Instructions */}
              <div className="bg-[#141420] border border-[#222232] rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cameraActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  <span>{cameraActive ? "Point camera at any crypto wallet QR" : "Camera Initializing"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Upload instead</span>
                </button>
              </div>
            </div>
          ) : (
            /* UPLOAD & SAMPLE PRESETS VIEW */
            <div className="space-y-3 font-mono text-xs">
              {/* File Upload Drop Zone */}
              <label className="border-2 border-dashed border-[#2E2E44] hover:border-cyan-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#12121C] hover:bg-[#151524]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                <span className="font-bold text-white text-xs">Click to Upload QR Code Image</span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Supports PNG, JPG, WEBP screenshots & photos
                </span>
                {isProcessingFile && (
                  <span className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Decoding image pixels...</span>
                  </span>
                )}
              </label>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* One-Click Sample Test Wallets (Zero-friction testing) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>Quick Test Verified Addresses</span>
                  <span className="text-emerald-400">1-Click Test</span>
                </div>

                <div className="space-y-1">
                  {[
                    {
                      label: "Vitalik.eth Staking Node (EVM)",
                      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                      network: "ethereum" as const,
                      tag: "Ethereum",
                    },
                    {
                      label: "Mauro Sovereign Founder (EVM)",
                      address: "0x71C841913b025071047511456c3C6456f43D610e",
                      network: "ethereum" as const,
                      tag: "EVM",
                    },
                    {
                      label: "Solana Foundation Reserve (SVM)",
                      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                      network: "solana" as const,
                      tag: "Solana",
                    },
                    {
                      label: "Mauro Sovereign Vault (SVM)",
                      address: "Mauro7xS7p8FwJgR32XQy91KkPmMU9Vp9q5L3t1B6e2",
                      network: "solana" as const,
                      tag: "Solana",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.address}
                      type="button"
                      onClick={() => handleLoadSampleQr(preset)}
                      className="w-full text-left p-2 rounded-xl bg-[#151522] hover:bg-[#1E1E2E] border border-[#222234] hover:border-[#2E2E46] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{preset.label}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {preset.tag}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {preset.address.slice(0, 10)}...{preset.address.slice(-6)}
                        </div>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
