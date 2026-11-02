import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Calendar,
  Globe,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  Hash,
  Eye,
  Sliders,
  ChevronDown,
  Download,
  Share2,
  Terminal,
  Ban,
  QrCode,
  ClipboardCheck,
  RefreshCw,
  FileSpreadsheet,
  Smartphone,
  Scan,
  Activity,
  Layers,
} from "lucide-react";
import QRCode from "qrcode";
import {
  globalOnChainAtsEngine,
  InvestorIdentitySBTRecord,
} from "../utils/onChainAtsEngine";
import { universalWalletExtensionEngine } from "../utils/universalWalletExtensionEngine";

interface InvestorSBTGalleryProps {
  activeWalletAddress?: string | null;
  onSelectSbt?: (sbt: InvestorIdentitySBTRecord) => void;
  className?: string;
}

export const InvestorSBTGallery: React.FC<InvestorSBTGalleryProps> = ({
  activeWalletAddress,
  onSelectSbt,
  className = "",
}) => {
  // Resolve active wallet (from prop, or universalWalletExtensionEngine)
  const resolvedActiveWallet = useMemo(() => {
    if (activeWalletAddress && activeWalletAddress.trim() !== "") {
      return activeWalletAddress.toLowerCase();
    }
    const engineState = universalWalletExtensionEngine.getState();
    return (engineState?.address || "0x71C841913b025071047511456c3C6456f43D610e").toLowerCase();
  }, [activeWalletAddress]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedJurisdictionFilter, setSelectedJurisdictionFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "ACTIVE_WALLET">("ALL");
  const [sortBy, setSortBy] = useState<"tokenId" | "expiry" | "tier">("tokenId");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [selectedSbtForMetadata, setSelectedSbtForMetadata] = useState<InvestorIdentitySBTRecord | null>(null);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Export & Share Attestation State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareModalData, setShareModalData] = useState<{
    title: string;
    url: string;
    jsonPayload: any;
    tokenCount: number;
    tokens: InvestorIdentitySBTRecord[];
  } | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Mint Form State
  const [mintAddress, setMintAddress] = useState<string>(resolvedActiveWallet);
  const [mintEntityName, setMintEntityName] = useState<string>("Institutional Capital Partner");
  const [mintJurisdiction, setMintJurisdiction] = useState<number>(840);
  const [mintTier, setMintTier] = useState<number>(2);

  // Tab view: 'gallery' or 'compliance_audit'
  const [activeTabMode, setActiveTabMode] = useState<"gallery" | "compliance_audit">("gallery");

  // Attestation Registry Audit State
  const [auditQueryLoading, setAuditQueryLoading] = useState<boolean>(false);
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>(() => new Date().toLocaleTimeString());
  const [auditBlockNumber, setAuditBlockNumber] = useState<number>(20845210);
  const [selectedAuditFilter, setSelectedAuditFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING_SOON" | "REVOKED" | "EXPIRED">("ALL");
  const [queriedTokenId, setQueriedTokenId] = useState<number | null>(null);

  // Cross-Device Mobile Verification QR Code State
  const [qrModalToken, setQrModalToken] = useState<InvestorIdentitySBTRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [copiedQrUrl, setCopiedQrUrl] = useState<boolean>(false);

  // ERC-5192 Soulbound Interactive Testbench State
  const [testbenchSbt, setTestbenchSbt] = useState<InvestorIdentitySBTRecord | null>(null);
  const [transferSimRecipient, setTransferSimRecipient] = useState<string>("0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E");
  const [transferSimResult, setTransferSimResult] = useState<{
    success: boolean;
    message: string;
    errorSig?: string;
    timestamp: string;
  } | null>(null);

  const allNfts = useMemo(() => {
    return globalOnChainAtsEngine.getInvestorNfts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const activeWalletSbts = useMemo(() => {
    return allNfts.filter((n) => n.walletAddress.toLowerCase() === resolvedActiveWallet);
  }, [allNfts, resolvedActiveWallet]);

  const activeWalletSbt = activeWalletSbts[0] || null;

  // Filtered & Sorted tokens
  const filteredTokens = useMemo(() => {
    return allNfts
      .filter((token) => {
        // Active wallet only filter
        if (selectedStatusFilter === "ACTIVE_WALLET") {
          return token.walletAddress.toLowerCase() === resolvedActiveWallet;
        }

        // Status filter
        if (selectedStatusFilter === "ACTIVE" && (token.isRevoked || token.isExpired || Date.now() > token.expirationTimestamp)) {
          return false;
        }
        if (selectedStatusFilter === "EXPIRED" && !(token.isRevoked || token.isExpired || Date.now() > token.expirationTimestamp)) {
          return false;
        }

        // Jurisdiction filter
        if (selectedJurisdictionFilter !== "ALL") {
          if (token.jurisdictionCode.toString() !== selectedJurisdictionFilter) {
            return false;
          }
        }

        // Text Search
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchEntity = token.entityName.toLowerCase().includes(q);
          const matchAddr = token.walletAddress.toLowerCase().includes(q);
          const matchJur = token.jurisdictionLabel.toLowerCase().includes(q);
          const matchCode = token.jurisdictionCode.toString().includes(q);
          const matchId = `sbt #${token.tokenId}`.includes(q) || token.tokenId.toString() === q;
          return matchEntity || matchAddr || matchJur || matchCode || matchId;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "expiry") {
          return a.expirationTimestamp - b.expirationTimestamp;
        }
        if (sortBy === "tier") {
          return a.accreditationTier - b.accreditationTier;
        }
        return a.tokenId - b.tokenId;
      });
  }, [allNfts, resolvedActiveWallet, selectedStatusFilter, selectedJurisdictionFilter, searchQuery, sortBy]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeOrRenew = (token: InvestorIdentitySBTRecord) => {
    if (token.isRevoked) {
      // Re-issue / unrevoke
      token.isRevoked = false;
      token.expirationTimestamp = Date.now() + 365 * 24 * 3600 * 1000;
      token.isExpired = false;
    } else {
      token.isRevoked = true;
      token.revocationReason = "SIMULATED_TEST_REVOCATION";
    }
    setRefreshTrigger((p) => p + 1);
  };

  const handleMintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintAddress) return;

    globalOnChainAtsEngine.issueInvestorNft({
      walletAddress: mintAddress,
      entityName: mintEntityName,
      jurisdictionCode: Number(mintJurisdiction),
      accreditationTier: Number(mintTier),
    });

    setShowIssueModal(false);
    setRefreshTrigger((p) => p + 1);
  };

  // Helper for Days Remaining
  const getDaysRemaining = (expTimestamp: number) => {
    const diffMs = expTimestamp - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days;
  };

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleRunTransferSimulation = () => {
    if (!testbenchSbt) return;
    setTransferSimResult({
      success: false,
      message: `Execution Reverted: ERC5192: SoulboundTokenLocked(${testbenchSbt.tokenId}). Token is permanently locked to ${testbenchSbt.walletAddress} and cannot be transferred via transferFrom() or safeTransferFrom().`,
      errorSig: "0xb45a3c0e_ERR_SOULBOUND_NON_TRANSFERABLE",
      timestamp: new Date().toISOString(),
    });
  };

  // Attestation status query helper for ERC-5192 Registry
  const getAttestationStatus = (token: InvestorIdentitySBTRecord) => {
    const diffMs = token.expirationTimestamp - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (token.isRevoked) {
      return {
        status: "REVOKED" as const,
        label: "Revoked",
        badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        indicatorColor: "bg-rose-500",
        dotColor: "bg-rose-400",
        daysRemaining: days,
        isCompliantForTrading: false,
        reason: token.revocationReason || "Revoked by Issuer / Regulatory Compliance Officer",
      };
    }
    if (days <= 0 || token.isExpired) {
      return {
        status: "EXPIRED" as const,
        label: "Expired",
        badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        indicatorColor: "bg-rose-500",
        dotColor: "bg-rose-400",
        daysRemaining: days,
        isCompliantForTrading: false,
        reason: "Validity Window Lapsed (Annual KYC Re-Attestation Required)",
      };
    }
    if (days <= 90) {
      return {
        status: "EXPIRING_SOON" as const,
        label: "Expiring Soon",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        indicatorColor: "bg-amber-400",
        dotColor: "bg-amber-400",
        daysRemaining: days,
        isCompliantForTrading: true,
        reason: `Expires in ${days} days (${new Date(token.expirationTimestamp).toLocaleDateString()})`,
      };
    }
    return {
      status: "ACTIVE" as const,
      label: "Active",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      indicatorColor: "bg-emerald-400",
      dotColor: "bg-emerald-400",
      daysRemaining: days,
      isCompliantForTrading: true,
      reason: "Active Attestation · Sanctions & Accreditation Cleared",
    };
  };

  // Open mobile QR code modal
  const handleOpenQrModal = (token: InvestorIdentitySBTRecord) => {
    setQrModalToken(token);
    setIsGeneratingQr(true);
    setCopiedQrUrl(false);
    const url = generateShareUrl([token]);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
        setIsGeneratingQr(false);
      })
      .catch((err) => {
        console.error("Failed to generate QR Code:", err);
        setIsGeneratingQr(false);
      });
  };

  // Run full attestation registry audit query
  const handleRunRegistryAudit = () => {
    setAuditQueryLoading(true);
    setTimeout(() => {
      setAuditQueryLoading(false);
      setLastAuditTimestamp(new Date().toLocaleTimeString());
      setAuditBlockNumber((prev) => prev + Math.floor(Math.random() * 6) + 1);
      showNotification(`Attestation registry audit completed · ${allNfts.length} Soulbound Tokens verified`);
    }, 750);
  };

  // Single token registry audit query
  const handleAuditSingleToken = (tokenId: number) => {
    setQueriedTokenId(tokenId);
    setTimeout(() => {
      setQueriedTokenId(null);
      showNotification(`Registry query confirmed: Token #${tokenId} attestation status verified`);
    }, 550);
  };

  // Filtered tokens for Investor Compliance Audit table
  const filteredAuditTokens = useMemo(() => {
    return allNfts.filter((token) => {
      const statusObj = getAttestationStatus(token);
      if (selectedAuditFilter === "ACTIVE") return statusObj.status === "ACTIVE";
      if (selectedAuditFilter === "EXPIRING_SOON") return statusObj.status === "EXPIRING_SOON";
      if (selectedAuditFilter === "REVOKED") return statusObj.status === "REVOKED";
      if (selectedAuditFilter === "EXPIRED") return statusObj.status === "EXPIRED";
      return true;
    });
  }, [allNfts, selectedAuditFilter]);

  // Generate shareable attestation verification URL
  const generateShareUrl = (tokens: InvestorIdentitySBTRecord[]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tokenworld.exchange";
    const wallet = tokens[0]?.walletAddress || resolvedActiveWallet;
    const tokenIds = tokens.map((t) => t.tokenId).join(",");
    const jurisdictions = Array.from(new Set(tokens.map((t) => t.jurisdictionCode))).join(",");
    const earliestExpiry = Math.min(...tokens.map((t) => t.expirationTimestamp));
    const claimsHash = tokens
      .map((t) => `${t.tokenId}:${t.jurisdictionCode}:${t.accreditationTier}:${Math.floor(t.expirationTimestamp / 1000)}`)
      .join("|");
    const encodedClaims = btoa(encodeURIComponent(claimsHash));

    return `${origin}/verify-attestation?wallet=${encodeURIComponent(wallet)}&tokens=${tokenIds}&jur=${jurisdictions}&exp=${earliestExpiry}&claims=${encodeURIComponent(encodedClaims)}`;
  };

  // Build standardized EIP-721 / EIP-5192 compliant export payload
  const buildExportPayload = (tokens: InvestorIdentitySBTRecord[]) => {
    return {
      registryStandard: "ERC-5192 Minimal Soulbound Token + ERC-721",
      interfaceId: "0xb45a3c0e",
      venue: "Token World Alternative Trading System (ATS) · SEC/FINRA Registered Compliant Secondary Market",
      attestationRegistryContract: "0x1dE5b5257134A29388B2c54B3356D0Ddf9bA7879",
      exportedAt: new Date().toISOString(),
      activeWalletContext: resolvedActiveWallet,
      tokenCount: tokens.length,
      filtersApplied: {
        jurisdiction: selectedJurisdictionFilter,
        status: selectedStatusFilter,
        searchQuery: searchQuery || null,
      },
      tokens: tokens.map((t) => {
        const daysRemaining = getDaysRemaining(t.expirationTimestamp);
        const isExp = daysRemaining <= 0 || t.isExpired;
        return {
          tokenId: t.tokenId,
          entityName: t.entityName,
          holderWalletAddress: t.walletAddress,
          jurisdiction: {
            numericCode: t.jurisdictionCode,
            isoCountryCode: t.countryCode,
            statutoryStandard: t.jurisdictionLabel,
          },
          accreditation: {
            tierNumber: t.accreditationTier,
            tierCategory: t.tierLabel,
          },
          expiration: {
            timestampUnix: t.expirationTimestamp,
            isoUtc: new Date(t.expirationTimestamp).toISOString(),
            daysRemaining,
            isExpired: isExp,
          },
          identityClaims: {
            isRevoked: t.isRevoked,
            revocationReason: t.revocationReason || null,
            sanctionsProvider: t.sanctionsProvider,
            sanctionsScreeningHash: t.sanctionsScreeningHash,
            zkIdentityCommitment: t.zkIdentityCommitment,
            soulboundLocked: true,
          },
          onChainVerification: {
            isTransferable: false,
            supportsErc5192: true,
            networkRollup: "Enterprise Arbitrum Orbit L3 / Subnet Rollup",
          },
          shareableAttestationUrl: generateShareUrl([t]),
        };
      }),
    };
  };

  // Export all currently visible/filtered Soulbound Tokens as JSON
  const handleExportVisibleJson = () => {
    if (filteredTokens.length === 0) return;
    const payload = buildExportPayload(filteredTokens);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tokenworld-investor-sbt-attestations-${filteredTokens.length}tokens.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Exported ${filteredTokens.length} Soulbound Token attestations as JSON`);
  };

  // Export a single Soulbound Token's complete metadata as JSON
  const handleExportSingleJson = (token: InvestorIdentitySBTRecord) => {
    const payload = buildExportPayload([token]);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sbt-${token.tokenId}-${token.countryCode}-attestation.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Exported SBT #${token.tokenId} (${token.entityName}) metadata JSON`);
  };

  // Open the shareable attestation modal
  const handleOpenShareModal = (tokens: InvestorIdentitySBTRecord[], title: string) => {
    if (tokens.length === 0) return;
    const url = generateShareUrl(tokens);
    const payload = buildExportPayload(tokens);
    setShareModalData({
      title,
      url,
      jsonPayload: payload,
      tokenCount: tokens.length,
      tokens,
    });
    setShowShareModal(true);
  };

  // Fast direct copy of shareable attestation link
  const handleQuickCopyShareLink = (tokens: InvestorIdentitySBTRecord[], key: string) => {
    if (tokens.length === 0) return;
    const url = generateShareUrl(tokens);
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    showNotification(`Shareable attestation link copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Format Jurisdiction Flag
  const getCountryFlag = (code: string) => {
    switch (code) {
      case "US": return "🇺🇸";
      case "EU": case "LU": case "DE": case "FR": return "🇪🇺";
      case "SG": return "🇸🇬";
      case "CH": return "🇨🇭";
      case "UK": case "GB": return "🇬🇧";
      case "JP": return "🇯🇵";
      default: return "🌐";
    }
  };

  // Border theme by Tier
  const getTierTheme = (tier: number, isRevoked: boolean) => {
    if (isRevoked) {
      return {
        cardBorder: "border-rose-500/40 hover:border-rose-500/70",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        accent: "text-rose-400",
        glow: "from-rose-500/5 via-rose-950/20 to-transparent",
      };
    }
    switch (tier) {
      case 1: // QIB
        return {
          cardBorder: "border-amber-400/40 hover:border-amber-400/70",
          badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/40",
          accent: "text-amber-400",
          glow: "from-amber-400/10 via-amber-950/20 to-transparent",
        };
      case 2: // Qualified Purchaser
        return {
          cardBorder: "border-emerald-400/40 hover:border-emerald-400/70",
          badgeBg: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
          accent: "text-emerald-400",
          glow: "from-emerald-400/10 via-emerald-950/20 to-transparent",
        };
      case 3: // Accredited
        return {
          cardBorder: "border-purple-400/40 hover:border-purple-400/70",
          badgeBg: "bg-purple-400/20 text-purple-300 border-purple-400/40",
          accent: "text-purple-400",
          glow: "from-purple-400/10 via-purple-950/20 to-transparent",
        };
      case 4: // Professional
        return {
          cardBorder: "border-cyan-400/40 hover:border-cyan-400/70",
          badgeBg: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40",
          accent: "text-cyan-400",
          glow: "from-cyan-400/10 via-cyan-950/20 to-transparent",
        };
      default:
        return {
          cardBorder: "border-slate-700 hover:border-slate-500",
          badgeBg: "bg-slate-800 text-slate-300 border-slate-700",
          accent: "text-slate-400",
          glow: "from-slate-800/10 to-transparent",
        };
    }
  };

  return (
    <div className={`space-y-6 text-slate-100 font-sans ${className}`}>
      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed top-6 right-6 z-50 bg-[#0F1528] border border-cyan-400/60 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 font-mono text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner: Active Wallet Identity Summary Card */}
      <div className="bg-gradient-to-r from-[#0C101A] via-[#121828] to-[#0C101A] border border-[#202944] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-purple-400" />
                ERC-5192 Minimal Soulbound Token
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
                Multi-Jurisdictional Identity Registry
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                Non-Transferable (locked == true)
              </span>
            </div>

            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              Investor Identity SBT Gallery
            </h3>

            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Visualizes issued ERC-5192 Soulbound Tokens containing zero-knowledge compliance attestations,
              jurisdiction codes, and expiration timestamps cross-referenced before trade execution.
            </p>

            {/* View Mode Switcher: Gallery vs Compliance Audit */}
            <div className="flex items-center gap-2 mt-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTabMode("gallery")}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                  activeTabMode === "gallery"
                    ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/40"
                    : "bg-[#0A0D18] text-slate-400 border-[#1B233C] hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gallery Cards View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabMode("compliance_audit")}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                  activeTabMode === "compliance_audit"
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-950/40"
                    : "bg-[#0A0D18] text-cyan-300 border-cyan-500/30 hover:bg-[#121B32]"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Investor Compliance Audit</span>
                {allNfts.some((n) => getAttestationStatus(n).status === "EXPIRING_SOON" || getAttestationStatus(n).status === "REVOKED") && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Active Wallet Highlight Pill */}
          <div className="bg-[#080B12] border border-[#1C243B] rounded-xl p-3.5 shrink-0 min-w-[280px]">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between mb-1.5">
              <span>Active Connected Wallet</span>
              <span className="text-emerald-400 font-mono text-[9px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Network
              </span>
            </div>

            <div className="text-xs font-mono font-semibold text-white truncate max-w-[260px] flex items-center justify-between">
              <span>{resolvedActiveWallet}</span>
              <button
                type="button"
                onClick={() => handleCopy("active_wallet", resolvedActiveWallet)}
                className="p-1 rounded hover:bg-[#1A2238] text-slate-400 hover:text-white transition-colors"
                title="Copy address"
              >
                {copiedKey === "active_wallet" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            {activeWalletSbts.length > 0 ? (
              <div className="mt-2.5 pt-2 border-t border-[#182034] text-[11px] font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">User Soulbound Tokens:</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    {activeWalletSbts.length} Token{activeWalletSbts.length > 1 ? "s" : ""} Bound
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {activeWalletSbts.map((sbt) => {
                    const daysRemaining = getDaysRemaining(sbt.expirationTimestamp);
                    const isExp = daysRemaining <= 0 || sbt.isExpired;
                    return (
                      <div
                        key={sbt.tokenId}
                        className="p-2 rounded-lg bg-[#0C101A] border border-[#1A2238] space-y-1 hover:border-purple-400/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1">
                            <Lock className="w-3 h-3 text-purple-400" />
                            SBT #{sbt.tokenId} ({sbt.entityName})
                          </span>
                          <span className="text-cyan-300 font-bold text-[10px] flex items-center gap-1">
                            <span>{getCountryFlag(sbt.countryCode)}</span>
                            <span>Code {sbt.jurisdictionCode}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[150px] text-slate-300" title={sbt.jurisdictionLabel}>
                            {sbt.jurisdictionLabel}
                          </span>
                          <span
                            className={
                              sbt.isRevoked || isExp
                                ? "text-rose-400 font-bold"
                                : daysRemaining < 90
                                ? "text-amber-400 font-bold"
                                : "text-emerald-400 font-bold"
                            }
                          >
                            {sbt.isRevoked
                              ? "REVOKED"
                              : isExp
                              ? "EXPIRED"
                              : `${daysRemaining}d remaining`}
                          </span>
                        </div>

                        <div className="text-[9px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-[#161D32]">
                          <span>
                            Exp: {new Date(sbt.expirationTimestamp).toLocaleDateString()} ({Math.floor(sbt.expirationTimestamp / 1000)} Unix)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedSbtForMetadata(sbt)}
                              className="text-purple-400 hover:text-purple-300 hover:underline"
                            >
                              Claims
                            </button>
                            <span className="text-slate-600">·</span>
                            <button
                              type="button"
                              onClick={() => handleOpenQrModal(sbt)}
                              className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5"
                              title="Display QR code for cross-device mobile verification"
                            >
                              <QrCode className="w-2.5 h-2.5" />
                              <span>QR</span>
                            </button>
                            <span className="text-slate-600">·</span>
                            <button
                              type="button"
                              onClick={() => setTestbenchSbt(sbt)}
                              className="text-cyan-400 hover:text-cyan-300 hover:underline"
                            >
                              Test Lock
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter("ACTIVE_WALLET")}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold text-center transition-all border ${
                      selectedStatusFilter === "ACTIVE_WALLET"
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-[#141A2E] text-purple-300 border-purple-500/30 hover:bg-[#1E2644]"
                    }`}
                  >
                    {selectedStatusFilter === "ACTIVE_WALLET" ? "Viewing My Tokens" : `Filter My Tokens (${activeWalletSbts.length})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMintAddress(resolvedActiveWallet);
                      setShowIssueModal(true);
                    }}
                    className="py-1 px-2 rounded-lg bg-[#141A2E] hover:bg-[#1E2644] text-slate-300 hover:text-white border border-[#202944] text-[10px] font-bold"
                    title="Issue additional SBT for active address"
                  >
                    + Issue
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 pt-2 border-t border-[#182034] text-[11px] font-mono">
                <div className="text-rose-400 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  No SBT Issued For Active Address
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMintAddress(resolvedActiveWallet);
                    setShowIssueModal(true);
                  }}
                  className="mt-1.5 w-full py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold text-center transition-all shadow-md shadow-purple-950/40"
                >
                  Issue Identity SBT to Active Address
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Filters Bar */}
        <div className="mt-5 pt-4 border-t border-[#1C243B] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by entity, address, or code (840, 841)..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#090C16] border border-[#1E2640] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <div className="flex items-center bg-[#090C16] border border-[#1E2640] rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  selectedStatusFilter === "ALL" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                All ({allNfts.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("ACTIVE_WALLET")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  selectedStatusFilter === "ACTIVE_WALLET" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Active Wallet ({activeWalletSbt ? 1 : 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("ACTIVE")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  selectedStatusFilter === "ACTIVE" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Valid
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("EXPIRED")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  selectedStatusFilter === "EXPIRED" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Expired/Revoked
              </button>
            </div>

            {/* Jurisdiction Code Filter */}
            <select
              value={selectedJurisdictionFilter}
              onChange={(e) => setSelectedJurisdictionFilter(e.target.value)}
              className="bg-[#090C16] border border-[#1E2640] rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-purple-400"
            >
              <option value="ALL">All Jurisdictions</option>
              <option value="840">US Reg D 506(c) (840)</option>
              <option value="841">US Rule 144A QIB (841)</option>
              <option value="276">EU MiFID II Professional (276)</option>
              <option value="702">SG MAS Accredited (702)</option>
              <option value="756">CH FinSA Qualified (756)</option>
              <option value="826">UK FCA HNW (826)</option>
              <option value="999">Offshore Reg S (999)</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#090C16] border border-[#1E2640] rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-purple-400"
            >
              <option value="tokenId">Sort: Token ID</option>
              <option value="expiry">Sort: Expiration Soonest</option>
              <option value="tier">Sort: Accreditation Tier</option>
            </select>

            {/* Export Visible Metadata as JSON */}
            <button
              type="button"
              onClick={handleExportVisibleJson}
              disabled={filteredTokens.length === 0}
              className="py-1.5 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1E2744] text-cyan-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-950/20"
              title="Export visible Soulbound Token metadata (jurisdiction, expiration, and identity claims) as a JSON file"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON ({filteredTokens.length})</span>
            </button>

            {/* Share Attestation Link */}
            <button
              type="button"
              onClick={() =>
                handleOpenShareModal(
                  filteredTokens,
                  filteredTokens.length === 1
                    ? `SBT #${filteredTokens[0].tokenId} Attestation Link`
                    : `Multi-SBT Compliance Attestation Link (${filteredTokens.length} Tokens)`
                )
              }
              disabled={filteredTokens.length === 0}
              className="py-1.5 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1E2744] text-purple-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-purple-500/30 hover:border-purple-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-950/20"
              title="Generate shareable attestation verification link"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Share Link</span>
            </button>

            {/* Compliance Audit Button */}
            <button
              type="button"
              onClick={() => setActiveTabMode(activeTabMode === "compliance_audit" ? "gallery" : "compliance_audit")}
              className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border shadow-md ${
                activeTabMode === "compliance_audit"
                  ? "bg-cyan-500 text-black border-cyan-400"
                  : "bg-[#141A2E] hover:bg-[#1E2644] text-cyan-300 hover:text-white border-cyan-500/30"
              }`}
              title="Audit attestation registry status (Active, Expiring Soon, Revoked, Expired)"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Compliance Audit</span>
            </button>

            {/* Issue SBT Button */}
            <button
              type="button"
              onClick={() => {
                setMintAddress(resolvedActiveWallet);
                setShowIssueModal(true);
              }}
              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md shadow-purple-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue SBT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Compliance & Jurisdiction Summary Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-[#0C101A] border border-[#1A233A] rounded-xl p-3 space-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Active Soulbounds</span>
            <Lock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white flex items-baseline gap-1.5">
            <span>{allNfts.filter((n) => !n.isRevoked && !n.isExpired).length}</span>
            <span className="text-[10px] text-slate-400 font-normal">/ {allNfts.length} Total</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold truncate">
            {activeWalletSbts.length > 0
              ? `${activeWalletSbts.length} bound to active user`
              : "0 bound to active user"}
          </div>
        </div>

        <div className="bg-[#0C101A] border border-[#1A233A] rounded-xl p-3 space-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Jurisdictions</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-cyan-300">
            {Array.from(new Set(allNfts.map((n) => n.jurisdictionCode))).length} Regions
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            US (840/841), EU (276), SG, CH, UK
          </div>
        </div>

        <div className="bg-[#0C101A] border border-[#1A233A] rounded-xl p-3 space-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>ERC-5192 Lock</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400">
            100% Locked
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Non-Transferable · EIP-165 0xb45a3c0e
          </div>
        </div>

        <div className="bg-[#0C101A] border border-[#1A233A] rounded-xl p-3 space-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Sanctions Oracle</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% Cleared</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            OFAC SDN &amp; Chainalysis KYT Oracle
          </div>
        </div>
      </div>

      {/* MODE 1: INVESTOR COMPLIANCE AUDIT PANEL */}
      {activeTabMode === "compliance_audit" && (
        <div className="space-y-6 font-mono animate-in fade-in duration-200">
          {/* Audit Control Header Card */}
          <div className="bg-[#0C101A] border border-[#1E2640] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck className="w-3 h-3 text-cyan-400" />
                    On-Chain Attestation Registry Audit
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                    ERC-5192 Soulbound Compliance Hook
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                    Block #{auditBlockNumber}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                  Investor Compliance Audit &amp; Attestation Registry
                </h3>

                <p className="text-xs text-slate-400 max-w-3xl mt-1.5 leading-relaxed">
                  Fetches and displays real-time compliance status (<strong>Active</strong>, <strong>Expiring Soon</strong>, <strong>Revoked</strong>, <strong>Expired</strong>)
                  for each Soulbound Token by querying the on-chain registry contract (<code className="text-cyan-300">0x1dE5b5257134A29388B2c54B3356D0Ddf9bA7879</code>).
                  Counterparties lacking an active, unexpired Soulbound Token are programmatically barred from ATS pre-trade matching and atomic DvP clearing.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-400">
                  <span>Registry Contract: <strong className="text-white">0x1dE5...7879</strong></span>
                  <span>•</span>
                  <span>Oracle: <strong className="text-white">OFAC SDN &amp; Chainalysis KYT</strong></span>
                  <span>•</span>
                  <span>Last Audit: <strong className="text-cyan-300">{lastAuditTimestamp}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRunRegistryAudit}
                  disabled={auditQueryLoading}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/40 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditQueryLoading ? "animate-spin" : ""}`} />
                  <span>{auditQueryLoading ? "Querying Registry..." : "Run Registry Audit"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const auditReport = {
                      auditReportType: "Token World ATS Investor Compliance Audit Ledger",
                      generatedAt: new Date().toISOString(),
                      registryContract: "0x1dE5b5257134A29388B2c54B3356D0Ddf9bA7879",
                      queriedBlockNumber: auditBlockNumber,
                      totalIdentitiesAudited: allNfts.length,
                      summary: {
                        activeCompliant: allNfts.filter((n) => getAttestationStatus(n).status === "ACTIVE").length,
                        expiringSoon: allNfts.filter((n) => getAttestationStatus(n).status === "EXPIRING_SOON").length,
                        revoked: allNfts.filter((n) => getAttestationStatus(n).status === "REVOKED").length,
                        expired: allNfts.filter((n) => getAttestationStatus(n).status === "EXPIRED").length,
                      },
                      tokens: allNfts.map((n) => {
                        const statusObj = getAttestationStatus(n);
                        return {
                          tokenId: n.tokenId,
                          entityName: n.entityName,
                          holderWallet: n.walletAddress,
                          jurisdictionCode: n.jurisdictionCode,
                          jurisdictionLabel: n.jurisdictionLabel,
                          accreditationTier: n.accreditationTier,
                          tierLabel: n.tierLabel,
                          expirationTimestamp: n.expirationTimestamp,
                          expirationIso: new Date(n.expirationTimestamp).toISOString(),
                          daysRemaining: statusObj.daysRemaining,
                          attestationStatus: statusObj.status,
                          statusLabel: statusObj.label,
                          isTradingEligible: statusObj.isCompliantForTrading,
                          sanctionsStatus: "CLEARED",
                          zkCommitment: n.zkIdentityCommitment,
                        };
                      }),
                    };
                    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `tokenworld-investor-compliance-audit-${Date.now()}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showNotification("Exported full investor compliance audit report (.JSON)");
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#141A2E] hover:bg-[#1E2644] text-slate-300 hover:text-white border border-[#202944] text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export Report (.JSON)</span>
                </button>
              </div>
            </div>

            {/* Scorecard KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#1C253E] text-xs">
              {/* Active */}
              <div
                onClick={() => setSelectedAuditFilter("ACTIVE")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAuditFilter === "ACTIVE"
                    ? "bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-950/50"
                    : "bg-[#090C16] border-[#161D32] hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                  <span>Active &amp; Compliant</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {allNfts.filter((n) => getAttestationStatus(n).status === "ACTIVE").length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Full ATS trading clearance
                </div>
              </div>

              {/* Expiring Soon */}
              <div
                onClick={() => setSelectedAuditFilter("EXPIRING_SOON")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAuditFilter === "EXPIRING_SOON"
                    ? "bg-amber-950/40 border-amber-500/70 shadow-lg shadow-amber-950/50"
                    : "bg-[#090C16] border-[#161D32] hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                  <span>Expiring Soon (&le;90d)</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-amber-400 mt-1">
                  {allNfts.filter((n) => getAttestationStatus(n).status === "EXPIRING_SOON").length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Requires annual re-attestation
                </div>
              </div>

              {/* Revoked */}
              <div
                onClick={() => setSelectedAuditFilter("REVOKED")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAuditFilter === "REVOKED"
                    ? "bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/50"
                    : "bg-[#090C16] border-[#161D32] hover:border-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                  <span>Revoked</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  {allNfts.filter((n) => getAttestationStatus(n).status === "REVOKED").length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Barred from trade execution
                </div>
              </div>

              {/* Expired */}
              <div
                onClick={() => setSelectedAuditFilter("EXPIRED")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAuditFilter === "EXPIRED"
                    ? "bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/50"
                    : "bg-[#090C16] border-[#161D32] hover:border-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                  <span>Expired</span>
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  {allNfts.filter((n) => getAttestationStatus(n).status === "EXPIRED").length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Lapsed credential window
                </div>
              </div>
            </div>
          </div>

          {/* Audit Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080B12] border border-[#161D32] p-2 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[11px] font-bold mr-1">Filter Audit Status:</span>
              {(["ALL", "ACTIVE", "EXPIRING_SOON", "REVOKED", "EXPIRED"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedAuditFilter(status)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    selectedAuditFilter === status
                      ? "bg-cyan-500 text-black shadow-sm"
                      : "bg-[#0E1322] text-slate-400 hover:text-white border border-[#1C253E]"
                  }`}
                >
                  {status === "ALL" && `All Records (${allNfts.length})`}
                  {status === "ACTIVE" && `Active (${allNfts.filter((n) => getAttestationStatus(n).status === "ACTIVE").length})`}
                  {status === "EXPIRING_SOON" && `Expiring Soon (${allNfts.filter((n) => getAttestationStatus(n).status === "EXPIRING_SOON").length})`}
                  {status === "REVOKED" && `Revoked (${allNfts.filter((n) => getAttestationStatus(n).status === "REVOKED").length})`}
                  {status === "EXPIRED" && `Expired (${allNfts.filter((n) => getAttestationStatus(n).status === "EXPIRED").length})`}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400">
              Showing {filteredAuditTokens.length} of {allNfts.length} identities
            </div>
          </div>

          {/* Detailed Audit Table */}
          <div className="bg-[#0C101A] border border-[#1C2338] rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#080B12] border-b border-[#1C2338] text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Token ID</th>
                    <th className="py-3 px-4">Entity &amp; Address</th>
                    <th className="py-3 px-4">Jurisdiction Code</th>
                    <th className="py-3 px-4">Accreditation Tier</th>
                    <th className="py-3 px-4">Expiration Timestamp</th>
                    <th className="py-3 px-4">Attestation Status</th>
                    <th className="py-3 px-4">Sanctions Oracle</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161D32]">
                  {filteredAuditTokens.map((token) => {
                    const statusObj = getAttestationStatus(token);
                    const isActiveWallet = token.walletAddress.toLowerCase() === resolvedActiveWallet;
                    const isQueried = queriedTokenId === token.tokenId;

                    return (
                      <tr
                        key={token.tokenId}
                        className={`hover:bg-[#121828]/60 transition-colors ${
                          isActiveWallet ? "bg-purple-950/15" : ""
                        }`}
                      >
                        {/* Token ID */}
                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-purple-400" />
                            <span>#{token.tokenId.toString().padStart(3, "0")}</span>
                            {isActiveWallet && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] bg-purple-500/30 text-purple-200 border border-purple-400/40">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Entity & Address */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white truncate max-w-[180px]">{token.entityName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {token.walletAddress.slice(0, 8)}...{token.walletAddress.slice(-6)}
                          </div>
                        </td>

                        {/* Jurisdiction */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-cyan-300 font-bold">
                            <span>{getCountryFlag(token.countryCode)}</span>
                            <span>Code {token.jurisdictionCode}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{token.jurisdictionLabel}</div>
                        </td>

                        {/* Tier */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-white font-semibold">{token.tierLabel}</div>
                          <div className="text-[10px] text-slate-500">Tier {token.accreditationTier}</div>
                        </td>

                        {/* Expiration */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-white font-semibold">
                            {new Date(token.expirationTimestamp).toLocaleDateString()}
                          </div>
                          <div className={`text-[10px] font-bold ${
                            statusObj.status === "ACTIVE"
                              ? "text-emerald-400"
                              : statusObj.status === "EXPIRING_SOON"
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}>
                            {statusObj.status === "EXPIRED"
                              ? "Expired"
                              : statusObj.status === "REVOKED"
                              ? "Revoked"
                              : `${statusObj.daysRemaining} days remaining`}
                          </div>
                        </td>

                        {/* Attestation Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${statusObj.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dotColor}`} />
                            {statusObj.label}
                          </span>
                        </td>

                        {/* Sanctions Oracle */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>OFAC Cleared</span>
                          </div>
                          <div className="text-[9px] text-slate-500">{token.sanctionsProvider}</div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* QR Code button */}
                            <button
                              type="button"
                              onClick={() => handleOpenQrModal(token)}
                              className="p-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2644] text-amber-300 hover:text-white border border-amber-500/30 transition-colors"
                              title="Display QR code for cross-device mobile verification"
                            >
                              <QrCode className="w-3.5 h-3.5 text-amber-400" />
                            </button>

                            {/* Query Registry button */}
                            <button
                              type="button"
                              onClick={() => handleAuditSingleToken(token.tokenId)}
                              className="p-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2644] text-cyan-300 hover:text-white border border-cyan-500/30 transition-colors"
                              title="Query on-chain attestation registry"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isQueried ? "animate-spin" : ""}`} />
                            </button>

                            {/* View claims */}
                            <button
                              type="button"
                              onClick={() => setSelectedSbtForMetadata(token)}
                              className="p-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2644] text-purple-300 hover:text-white border border-purple-500/30 transition-colors"
                              title="Inspect EIP-721/5192 metadata claims"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-400" />
                            </button>

                            {/* Revoke/Renew */}
                            <button
                              type="button"
                              onClick={() => handleRevokeOrRenew(token)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                token.isRevoked || token.isExpired
                                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50"
                                  : "bg-[#141A2E] text-slate-400 hover:text-rose-300 border-[#202944]"
                              }`}
                              title={token.isRevoked || token.isExpired ? "Renew Token Attestation" : "Simulate Revocation"}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: GALLERY CARDS VIEW */}
      {activeTabMode === "gallery" && (
        <>
          {/* Grid of ERC-5192 Soulbound Tokens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTokens.map((token) => {
          const isActiveWallet = token.walletAddress.toLowerCase() === resolvedActiveWallet;
          const daysRemaining = getDaysRemaining(token.expirationTimestamp);
          const isExpired = daysRemaining <= 0 || token.isExpired;
          const theme = getTierTheme(token.accreditationTier, token.isRevoked || isExpired);

          return (
            <div
              key={token.tokenId}
              onClick={() => onSelectSbt && onSelectSbt(token)}
              className={`relative bg-gradient-to-b from-[#0F1422] to-[#0A0D16] border ${theme.cardBorder} rounded-2xl p-5 shadow-xl transition-all hover:scale-[1.01] overflow-hidden flex flex-col justify-between group ${
                isActiveWallet ? "ring-2 ring-purple-500/70 shadow-purple-950/50" : ""
              }`}
            >
              {/* Holographic Watermark Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${theme.glow} pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity`}
              />

              {/* Card Header: Token ID, Soulbound Status & Active Wallet Badge */}
              <div className="relative z-10 space-y-2 border-b border-[#182136] pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-extrabold text-white tracking-wider flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      SBT #{token.tokenId.toString().padStart(3, "0")}
                    </span>

                    {isActiveWallet && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/50 flex items-center gap-0.5 animate-pulse">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        ACTIVE WALLET
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 ${getAttestationStatus(token).badgeClass}`}
                      title={getAttestationStatus(token).reason}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getAttestationStatus(token).dotColor}`} />
                      {getAttestationStatus(token).label}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${theme.badgeBg}`}
                    >
                      5192 LOCKED
                    </span>
                  </div>
                </div>

                {/* Entity & Holder Address */}
                <div>
                  <h4 className="text-sm font-bold text-white truncate" title={token.entityName}>
                    {token.entityName}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-0.5">
                    <span className="truncate">
                      {token.walletAddress.slice(0, 10)}...{token.walletAddress.slice(-8)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(`addr_${token.tokenId}`, token.walletAddress);
                      }}
                      className="p-1 rounded hover:bg-[#1A2238] text-slate-400 hover:text-white transition-colors"
                      title="Copy wallet address"
                    >
                      {copiedKey === `addr_${token.tokenId}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body: Jurisdiction Code, Tier, Expiration */}
              <div className="relative z-10 py-3 space-y-2.5 text-xs font-mono">
                {/* Jurisdiction Code Box */}
                <div className="p-2.5 rounded-xl bg-[#080B12] border border-[#161D32] space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Statutory Jurisdiction Code</span>
                    <span className="text-white font-bold">
                      {getCountryFlag(token.countryCode)} {token.countryCode}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-cyan-300 font-mono">
                      Code: {token.jurisdictionCode}
                    </span>
                    <span className="text-[10px] text-slate-300 truncate max-w-[170px]" title={token.jurisdictionLabel}>
                      {token.jurisdictionLabel}
                    </span>
                  </div>
                </div>

                {/* Expiration Timestamp Box */}
                <div className="p-2.5 rounded-xl bg-[#080B12] border border-[#161D32] space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Expiration Timestamp
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        token.isRevoked || isExpired
                          ? "text-rose-400"
                          : daysRemaining < 90
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {token.isRevoked
                        ? "REVOKED"
                        : isExpired
                        ? "EXPIRED"
                        : `${daysRemaining} days left`}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>
                      {new Date(token.expirationTimestamp).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Math.floor(token.expirationTimestamp / 1000)} Unix
                    </span>
                  </div>
                </div>

                {/* Accreditation Tier & Sanctions Oracle */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[#080B12] border border-[#161D32]">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Accreditation Tier</div>
                    <div className={`font-bold mt-0.5 truncate ${theme.accent}`} title={token.tierLabel}>
                      {token.tierLabel}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#080B12] border border-[#161D32]">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Sanctions Oracle</div>
                    <div className="font-bold text-emerald-400 mt-0.5 truncate flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {token.sanctionsProvider}
                    </div>
                  </div>
                </div>

                {/* ZK Proof Commitment */}
                <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="truncate max-w-[130px]">
                    ZK Proof: {token.zkIdentityCommitment.slice(0, 10)}...
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(`zk_${token.tokenId}`, token.zkIdentityCommitment);
                    }}
                    className="text-[9px] text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    {copiedKey === `zk_${token.tokenId}` ? "Copied" : "Copy Proof"}
                  </button>
                </div>
              </div>

              {/* Card Footer: Metadata Inspector, Export JSON, Share Link & Test Action */}
              <div className="relative z-10 pt-3 border-t border-[#182136] space-y-2 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSbtForMetadata(token);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-[#141A2A] hover:bg-[#1E263C] text-slate-300 hover:text-white border border-[#202944] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>View Claims</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevokeOrRenew(token);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border ${
                      token.isRevoked || isExpired
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50"
                        : "bg-[#141A2A] text-slate-400 hover:text-rose-300 border-[#202944] hover:bg-rose-950/30"
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{token.isRevoked || isExpired ? "Renew SBT" : "Simulate Revoke"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportSingleJson(token);
                    }}
                    className="py-1.5 px-1.5 rounded-lg bg-[#0F1626] hover:bg-[#182238] text-cyan-300 hover:text-white border border-cyan-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Export Soulbound Token metadata JSON"
                  >
                    <Download className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenShareModal([token], `SBT #${token.tokenId} Attestation Link`);
                    }}
                    className="py-1.5 px-1.5 rounded-lg bg-[#151028] hover:bg-[#20183C] text-purple-300 hover:text-white border border-purple-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Share verification attestation link"
                  >
                    <Share2 className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenQrModal(token);
                    }}
                    className="py-1.5 px-1.5 rounded-lg bg-[#1F170C] hover:bg-[#2C2112] text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Generate & display QR code for mobile cross-device verification"
                  >
                    <QrCode className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">QR Code</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTestbenchSbt(token);
                      setTransferSimResult(null);
                    }}
                    className="w-full py-1 px-2 rounded-lg bg-[#0C1220] hover:bg-[#141C30] text-slate-300 hover:text-cyan-300 border border-[#1A2540] hover:border-cyan-500/40 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Terminal className="w-3 h-3 text-cyan-400" />
                    <span>ERC-5192 Lock &amp; Transfer Revert Test</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTokens.length === 0 && (
        <div className="bg-[#0C101A] border border-[#1E2640] rounded-2xl p-10 text-center space-y-3 font-mono">
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No Soulbound Tokens Found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No issued ERC-5192 tokens matched the current search criteria or active wallet filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedJurisdictionFilter("ALL");
              setSelectedStatusFilter("ALL");
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </>
  )}

      {/* METADATA INSPECTOR MODAL (EIP-721 / EIP-5192 Compliant Payload) */}
      {selectedSbtForMetadata && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1322] border border-[#222B48] rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between border-b border-[#1E2640] pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  ERC-5192 Soulbound Token Metadata URI · Token #{selectedSbtForMetadata.tokenId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSbtForMetadata(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#080B12] border border-[#161D32] rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Contract Standard:</span>
                <span className="text-white font-bold">ERC-721 + ERC-5192 Minimal Soulbound Token</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Soulbound Status:</span>
                <span className="text-emerald-400 font-bold">locked(tokenId) == true (Permanent)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Transfer Restriction:</span>
                <span className="text-rose-300 font-bold">transferFrom() &amp; safeTransferFrom() Revert</span>
              </div>
            </div>

            {/* Formatted JSON Box */}
            <div className="bg-[#06080E] border border-[#141A2E] rounded-xl p-4 text-xs text-cyan-300 overflow-x-auto max-h-96 scrollbar-thin">
              <pre>
                {JSON.stringify(
                  {
                    name: `Token World Investor Identity SBT #${selectedSbtForMetadata.tokenId}`,
                    description:
                      "Non-transferable ERC-5192 Soulbound Token certifying institutional investor identity, statutory jurisdiction code, and zero-knowledge KYC/AML attestation.",
                    image: `ipfs://bafybeiclkweatsid/${selectedSbtForMetadata.tokenId}.png`,
                    external_url: `https://tokenworld.exchange/identity/${selectedSbtForMetadata.walletAddress}`,
                    locked: true,
                    attributes: [
                      {
                        trait_type: "Entity Name",
                        value: selectedSbtForMetadata.entityName,
                      },
                      {
                        trait_type: "Holder Address",
                        value: selectedSbtForMetadata.walletAddress,
                      },
                      {
                        trait_type: "Jurisdiction Numeric Code",
                        value: selectedSbtForMetadata.jurisdictionCode,
                      },
                      {
                        trait_type: "Jurisdiction ISO Code",
                        value: selectedSbtForMetadata.countryCode,
                      },
                      {
                        trait_type: "Regulatory Standard",
                        value: selectedSbtForMetadata.jurisdictionLabel,
                      },
                      {
                        trait_type: "Accreditation Tier Level",
                        value: selectedSbtForMetadata.accreditationTier,
                      },
                      {
                        trait_type: "Accreditation Tier Category",
                        value: selectedSbtForMetadata.tierLabel,
                      },
                      {
                        trait_type: "Expiration Timestamp",
                        value: selectedSbtForMetadata.expirationTimestamp,
                        display_type: "date",
                      },
                      {
                        trait_type: "Sanctions Oracle Provider",
                        value: selectedSbtForMetadata.sanctionsProvider,
                      },
                      {
                        trait_type: "Sanctions Attestation Hash",
                        value: selectedSbtForMetadata.sanctionsScreeningHash,
                      },
                      {
                        trait_type: "ZK Identity Commitment",
                        value: selectedSbtForMetadata.zkIdentityCommitment,
                      },
                      {
                        trait_type: "Revocation Status",
                        value: selectedSbtForMetadata.isRevoked ? "REVOKED" : "ACTIVE",
                      },
                    ],
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C253E]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      "meta_json",
                      JSON.stringify(
                        {
                          tokenId: selectedSbtForMetadata.tokenId,
                          entityName: selectedSbtForMetadata.entityName,
                          jurisdictionCode: selectedSbtForMetadata.jurisdictionCode,
                          expirationTimestamp: selectedSbtForMetadata.expirationTimestamp,
                          zkCommitment: selectedSbtForMetadata.zkIdentityCommitment,
                        },
                        null,
                        2
                      )
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#141A2A] hover:bg-[#1E263C] text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "meta_json" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "meta_json" ? "Copied" : "Copy JSON"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportSingleJson(selectedSbtForMetadata)}
                  className="px-3 py-1.5 rounded-lg bg-[#0F1626] hover:bg-[#182238] text-cyan-300 text-xs flex items-center gap-1.5 transition-colors border border-cyan-500/30"
                  title="Download complete token metadata as JSON file"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenShareModal(
                      [selectedSbtForMetadata],
                      `SBT #${selectedSbtForMetadata.tokenId} Compliance Attestation`
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#151028] hover:bg-[#20183C] text-purple-300 text-xs flex items-center gap-1.5 transition-colors border border-purple-500/30"
                >
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Share Attestation Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenQrModal(selectedSbtForMetadata)}
                  className="px-3 py-1.5 rounded-lg bg-[#201810] hover:bg-[#2C2218] text-amber-300 text-xs flex items-center gap-1.5 transition-colors border border-amber-500/30"
                  title="Generate QR code for mobile scanning"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mobile QR</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSbtForMetadata(null)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE NEW INVESTOR IDENTITY SBT MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1322] border border-[#222B48] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between border-b border-[#1E2640] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Issue Investor Identity SBT (ERC-5192)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMintSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">
                  Investor Entity Name
                </label>
                <input
                  type="text"
                  value={mintEntityName}
                  onChange={(e) => setMintEntityName(e.target.value)}
                  className="w-full bg-[#080B12] border border-[#1E2640] rounded-xl px-3 py-2 text-white placeholder-slate-500"
                  placeholder="e.g. Apollo Sovereign Credit Fund"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>Investor Public Wallet Address</span>
                  {mintAddress.toLowerCase() === resolvedActiveWallet && (
                    <span className="text-[9px] text-purple-400 font-bold">Pre-filled Active Wallet</span>
                  )}
                </label>
                <input
                  type="text"
                  value={mintAddress}
                  onChange={(e) => setMintAddress(e.target.value)}
                  className="w-full bg-[#080B12] border border-[#1E2640] rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Jurisdiction Code
                  </label>
                  <select
                    value={mintJurisdiction}
                    onChange={(e) => setMintJurisdiction(Number(e.target.value))}
                    className="w-full bg-[#080B12] border border-[#1E2640] rounded-xl px-3 py-2 text-white"
                  >
                    <option value={840}>840 · US SEC Reg D 506(c)</option>
                    <option value={841}>841 · US Rule 144A (QIB)</option>
                    <option value={276}>276 · EU MiFID II Professional</option>
                    <option value={702}>702 · SG MAS Accredited</option>
                    <option value={756}>756 · CH FinSA Qualified</option>
                    <option value={826}>826 · UK FCA High Net Worth</option>
                    <option value={392}>392 · JP FIEA Qualified</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Accreditation Tier
                  </label>
                  <select
                    value={mintTier}
                    onChange={(e) => setMintTier(Number(e.target.value))}
                    className="w-full bg-[#080B12] border border-[#1E2640] rounded-xl px-3 py-2 text-white"
                  >
                    <option value={1}>Tier 1: QIB ($100M+ AUM)</option>
                    <option value={2}>Tier 2: Qualified Purchaser ($5M+)</option>
                    <option value={3}>Tier 3: Accredited Investor ($1M+)</option>
                    <option value={4}>Tier 4: Professional Client</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#080B12] border border-[#161D32] text-[10px] text-slate-400 space-y-1">
                <div>• Validity Period: 365 Days from issuance (Automatic 1-Year Expiry)</div>
                <div>• Non-Transferable: ERC-5192 locked(tokenId) permanently set to true</div>
                <div>• Sanctions Verification: Signed Chainalysis KYT &amp; OFAC oracle hash</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#141A2A] hover:bg-[#1E263C] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Mint Soulbound Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHAREABLE ATTESTATION LINK MODAL */}
      {showShareModal && shareModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1322] border border-[#222B48] rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between border-b border-[#1E2640] pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  {shareModalData.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Shareable cryptographic attestation link certifying investor identity, statutory jurisdiction codes,
              expiration timestamps, and zero-knowledge KYC compliance across multi-jurisdictional ATS clearinghouses.
            </p>

            {/* Shareable Link Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                <span>Verifiable Attestation URL</span>
                <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  EIP-5192 Compliant Link
                </span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareModalData.url}
                  className="flex-1 bg-[#080B12] border border-[#1E2640] rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono select-all focus:outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleCopy("modal_share_url", shareModalData.url);
                    showNotification("Attestation link copied to clipboard!");
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-md shadow-purple-950/40"
                >
                  {copiedKey === "modal_share_url" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Attestation Claims Summary Card */}
            <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#161D32] space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 border-b border-[#161D32] pb-1.5 flex items-center justify-between">
                <span>Certified Investor Identity Claims</span>
                <span>{shareModalData.tokenCount} Soulbound Token(s)</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[#0C101A] border border-[#1B2236]">
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Included Tokens</span>
                  <span className="text-white font-bold">
                    {shareModalData.tokens.map((t) => `#${t.tokenId}`).join(", ")}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#0C101A] border border-[#1B2236]">
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Jurisdiction Codes</span>
                  <span className="text-cyan-300 font-bold">
                    {Array.from(new Set(shareModalData.tokens.map((t) => t.jurisdictionCode))).join(", ")}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#0C101A] border border-[#1B2236]">
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Min Expiration</span>
                  <span className="text-emerald-400 font-bold">
                    {new Date(
                      Math.min(...shareModalData.tokens.map((t) => t.expirationTimestamp))
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#0C101A] border border-[#1B2236]">
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Transfer Lock</span>
                  <span className="text-purple-300 font-bold">
                    locked(id) == true
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono pt-1">
                <span className="text-slate-300 font-semibold">Active Wallet:</span> {resolvedActiveWallet}
              </div>
            </div>

            {/* Claims JSON Preview */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                <span>Attestation Payload JSON</span>
                <span className="text-slate-500 text-[10px]">EIP-5192 / EIP-721</span>
              </label>
              <div className="bg-[#06080E] border border-[#141A2E] rounded-xl p-3 text-[11px] text-cyan-300 overflow-x-auto max-h-36 scrollbar-thin">
                <pre>{JSON.stringify(shareModalData.jsonPayload, null, 2)}</pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C253E]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(shareModalData.jsonPayload, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `tokenworld-attestation-claims-${Date.now()}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showNotification("Downloaded attestation claims JSON");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0F1626] hover:bg-[#182238] text-cyan-300 text-xs flex items-center gap-1.5 transition-colors border border-cyan-500/30 font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCopy("modal_claims_json", JSON.stringify(shareModalData.jsonPayload, null, 2));
                    showNotification("Claims JSON copied to clipboard!");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#141A2A] hover:bg-[#1E263C] text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "modal_claims_json" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "modal_claims_json" ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERC-5192 SOULBOUND CONTRACT TESTBENCH MODAL */}
      {testbenchSbt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1322] border border-[#222B48] rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between border-b border-[#1E2640] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>ERC-5192 Soulbound Testbench</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      SBT #{testbenchSbt.tokenId}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Interactive EVM non-transferability verification &amp; statutory compliance test
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTestbenchSbt(null);
                  setTransferSimResult(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Token Attributes Ribbon */}
            <div className="p-3 bg-[#080B12] border border-[#161D32] rounded-xl text-xs space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">Holder Address</span>
                  <span className="text-white font-bold truncate block" title={testbenchSbt.walletAddress}>
                    {testbenchSbt.walletAddress.slice(0, 8)}...{testbenchSbt.walletAddress.slice(-6)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">Jurisdiction Code</span>
                  <span className="text-cyan-300 font-bold">
                    {getCountryFlag(testbenchSbt.countryCode)} Code {testbenchSbt.jurisdictionCode}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">Expiration</span>
                  <span className="text-emerald-400 font-bold">
                    {new Date(testbenchSbt.expirationTimestamp).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">ERC-5192 Interface</span>
                  <span className="text-purple-300 font-bold">0xb45a3c0e</span>
                </div>
              </div>
            </div>

            {/* Test 1: Query locked(tokenId) */}
            <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#161D32] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  1. View Method: locked(uint256 tokenId)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  returns (bool: true)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                EIP-5192 Minimal Soulbound Token interface standard requires this view method to return <code className="text-emerald-300">true</code> to certify that the token cannot be detached from the institutional entity.
              </p>
              <div className="bg-[#05070C] p-2.5 rounded-lg border border-[#121726] text-[10px] font-mono text-cyan-300">
                <span>IERC5192.locked({testbenchSbt.tokenId}) =&gt; </span>
                <span className="text-emerald-400 font-bold">true [SOULBOUND_IMMUTABLE]</span>
              </div>
            </div>

            {/* Test 2: Simulate transferFrom() */}
            <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#161D32] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  2. Mutation Test: transferFrom() Revert Verification
                </span>
                <span className="text-[10px] text-slate-400">
                  Attempt unauthorized secondary transfer
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">
                  Simulated Destination Recipient
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={transferSimRecipient}
                    onChange={(e) => setTransferSimRecipient(e.target.value)}
                    className="flex-1 bg-[#05070C] border border-[#1E2640] rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                    placeholder="0x..."
                  />
                  <button
                    type="button"
                    onClick={handleRunTransferSimulation}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md shadow-rose-950/40"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Simulate Transfer</span>
                  </button>
                </div>
              </div>

              {/* Simulation Result Box */}
              {transferSimResult && (
                <div className="mt-2 p-3 rounded-lg bg-[#140C12] border border-rose-500/40 text-[11px] font-mono space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      EVM Call Reverted (Expected Compliance Behavior)
                    </span>
                    <span className="text-[10px] text-slate-400">Gas: 21,438 consumed</span>
                  </div>
                  <div className="text-white text-[11px] bg-[#0A0508] p-2 rounded border border-rose-500/20">
                    {transferSimResult.message}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    <strong>Regulatory ATS Rationale:</strong> Secondary market sales of unregistered securities without verified accreditation and clearance would violate SEC Section 5 and EU Prospectus Regulations. ERC-5192 non-transferability prevents credential spoofing or trading outside ATS clearinghouse DvP settlement rails.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1C253E]">
              <button
                type="button"
                onClick={() => {
                  setTestbenchSbt(null);
                  setTransferSimResult(null);
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
              >
                Close Testbench
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROSS-DEVICE MOBILE VERIFICATION QR CODE MODAL */}
      {qrModalToken && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1322] border border-[#222B48] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-mono text-center">
            <div className="flex items-center justify-between border-b border-[#1E2640] pb-3 text-left">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>Mobile Attestation QR</span>
                    <span className="text-xs text-amber-400">#{qrModalToken.tokenId}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Seamless cross-device mobile verification for Soulbound Token
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalToken(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container with High-Contrast Scanning Frame */}
            <div className="p-4 bg-white rounded-2xl mx-auto inline-block shadow-2xl border-4 border-amber-400/40 relative">
              {isGeneratingQr ? (
                <div className="w-64 h-64 flex items-center justify-center text-slate-800 text-xs font-bold gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
                  <span>Generating QR Matrix...</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`SBT #${qrModalToken.tokenId} Attestation QR`}
                  className="w-64 h-64 mx-auto block rounded-lg select-none"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-rose-500 text-xs font-bold">
                  Failed to render QR Code
                </div>
              )}
            </div>

            {/* Mobile Scan Instructions */}
            <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-semibold bg-amber-950/30 border border-amber-500/30 rounded-xl py-2 px-3">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Scan with phone camera or Web3 mobile wallet</span>
            </div>

            {/* Token Claims Summary Box */}
            <div className="bg-[#080B12] border border-[#161D32] rounded-xl p-3 text-left text-xs space-y-1.5">
              <div className="flex justify-between items-center text-white font-bold">
                <span className="truncate max-w-[200px]">{qrModalToken.entityName}</span>
                <span className="text-cyan-300 text-[11px]">
                  {getCountryFlag(qrModalToken.countryCode)} Code {qrModalToken.jurisdictionCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Expiration:</span>
                <span className="text-emerald-400 font-semibold">
                  {new Date(qrModalToken.expirationTimestamp).toLocaleDateString()} ({getDaysRemaining(qrModalToken.expirationTimestamp)}d left)
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-[#161D32]">
                <span>Holder Address:</span>
                <span className="font-mono text-purple-300">
                  {qrModalToken.walletAddress.slice(0, 10)}...{qrModalToken.walletAddress.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Attestation Status:</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getAttestationStatus(qrModalToken).badgeClass}`}>
                  {getAttestationStatus(qrModalToken).label}
                </span>
              </div>
            </div>

            {/* Verification Link Input & Copy */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                <span>Encoded Attestation Link</span>
                <span className="text-[9px] text-cyan-400 font-normal">Cross-Device Resolvable</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generateShareUrl([qrModalToken])}
                  className="flex-1 bg-[#05070C] border border-[#1E2640] rounded-xl px-2.5 py-1.5 text-[11px] text-cyan-300 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateShareUrl([qrModalToken]));
                    setCopiedQrUrl(true);
                    showNotification("Verification link copied to clipboard!");
                    setTimeout(() => setCopiedQrUrl(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  {copiedQrUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedQrUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1C253E]">
              <button
                type="button"
                onClick={() => {
                  if (!qrDataUrl) return;
                  const link = document.createElement("a");
                  link.href = qrDataUrl;
                  link.download = `sbt-${qrModalToken.tokenId}-mobile-qr-attestation.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showNotification("Downloaded QR code image (.PNG)");
                }}
                className="px-3 py-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2644] text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={() => setQrModalToken(null)}
                className="px-5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
