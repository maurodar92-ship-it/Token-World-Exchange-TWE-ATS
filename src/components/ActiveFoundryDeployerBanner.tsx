import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Wallet,
  CheckCircle2,
  Landmark,
  Rocket,
  TrendingUp,
  TrendingDown,
  Activity,
  Coins,
  ArrowDownUp,
  Calendar,
  Globe,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import {
  FOUNDRY_SOVEREIGN_DEPLOYER,
  SOLANA_SOVEREIGN_DEPLOYER,
  PROTOCOL_TREASURY_ADDRESS,
  BASE_CHAIN_ID,
  BASE_TREASURY_ADDRESS,
  POLYGON_CHAIN_ID,
  POLYGON_TREASURY_ADDRESS,
  SOLANA_MULTISIG_TREASURY,
} from "../utils/treasuryConstants";
import { TokenRecord } from "../types";
import { GasEstimatorWidget } from "./GasEstimatorWidget";

interface ActiveFoundryDeployerBannerProps {
  activeDeployerAddress: string;
  solanaDeployerAddress?: string;
  baseTreasuryAddress?: string;
  polygonTreasuryAddress?: string;
  treasuryAddress?: string;
  solanaMultiSigTreasuryAddress?: string;
  isMetaMaskConnected: boolean;
  totalTokensCount: number;
  tokens?: TokenRecord[];
  totalMarketCap?: number;
  onOpenMetaMaskSync: () => void;
  onGenerateWithDeployer: () => void;
  onGenerateSolanaTokens?: () => void;
  onSyncAllTokensToDeployer: () => void;
  onResetToFoundryDeployer?: () => void;
  onOpenMarketDeploy?: () => void;
  onOpenGlobalSwapSell?: () => void;
  onOpenPortfolio?: () => void;
  onOpenAtsExchange?: () => void;
  onOpenWeeklyTree3Update?: () => void;
  onOpenWorldConnectivity?: () => void;
  onOpenThreatScanner?: () => void;
  onOpenMaoMaoTransfer?: () => void;
}

export const ActiveFoundryDeployerBanner: React.FC<ActiveFoundryDeployerBannerProps> = ({
  activeDeployerAddress,
  solanaDeployerAddress = SOLANA_SOVEREIGN_DEPLOYER,
  baseTreasuryAddress = BASE_TREASURY_ADDRESS,
  polygonTreasuryAddress = POLYGON_TREASURY_ADDRESS,
  treasuryAddress = PROTOCOL_TREASURY_ADDRESS,
  solanaMultiSigTreasuryAddress = SOLANA_MULTISIG_TREASURY,
  isMetaMaskConnected,
  totalTokensCount,
  tokens,
  totalMarketCap,
  onOpenMetaMaskSync,
  onGenerateWithDeployer,
  onGenerateSolanaTokens,
  onSyncAllTokensToDeployer,
  onResetToFoundryDeployer,
  onOpenMarketDeploy,
  onOpenGlobalSwapSell,
  onOpenPortfolio,
  onOpenAtsExchange,
  onOpenWeeklyTree3Update,
  onOpenWorldConnectivity,
  onOpenThreatScanner,
  onOpenMaoMaoTransfer,
}) => {
  const [copiedEvm, setCopiedEvm] = useState(false);
  const [copiedSolana, setCopiedSolana] = useState(false);
  const [copiedBaseTreasury, setCopiedBaseTreasury] = useState(false);
  const [copiedPolygonTreasury, setCopiedPolygonTreasury] = useState(false);
  const [copiedTreasury, setCopiedTreasury] = useState(false);
  const [copiedSolanaTreasury, setCopiedSolanaTreasury] = useState(false);
  const [isTreasuryHiddenInVault, setIsTreasuryHiddenInVault] = useState<boolean>(true);
  const isFoundryDefault =
    activeDeployerAddress.toLowerCase() === FOUNDRY_SOVEREIGN_DEPLOYER.toLowerCase();

  const handleCopyEvm = () => {
    navigator.clipboard.writeText(activeDeployerAddress);
    setCopiedEvm(true);
    setTimeout(() => setCopiedEvm(false), 2000);
  };

  const handleCopySolana = () => {
    navigator.clipboard.writeText(solanaDeployerAddress);
    setCopiedSolana(true);
    setTimeout(() => setCopiedSolana(false), 2000);
  };

  const handleCopyBaseTreasury = () => {
    if (isTreasuryHiddenInVault) {
      navigator.clipboard.writeText("[HIDDEN IN VAULT - SECURED COLD STORAGE]");
    } else {
      navigator.clipboard.writeText(baseTreasuryAddress);
    }
    setCopiedBaseTreasury(true);
    setTimeout(() => setCopiedBaseTreasury(false), 2000);
  };

  const handleCopyPolygonTreasury = () => {
    if (isTreasuryHiddenInVault) {
      navigator.clipboard.writeText("[HIDDEN IN VAULT - SECURED COLD STORAGE]");
    } else {
      navigator.clipboard.writeText(polygonTreasuryAddress);
    }
    setCopiedPolygonTreasury(true);
    setTimeout(() => setCopiedPolygonTreasury(false), 2000);
  };

  const handleCopyTreasury = () => {
    if (isTreasuryHiddenInVault) {
      navigator.clipboard.writeText("[HIDDEN IN VAULT - SECURED COLD STORAGE]");
    } else {
      navigator.clipboard.writeText(treasuryAddress);
    }
    setCopiedTreasury(true);
    setTimeout(() => setCopiedTreasury(false), 2000);
  };

  const handleCopySolanaTreasury = () => {
    if (isTreasuryHiddenInVault) {
      navigator.clipboard.writeText("[HIDDEN IN VAULT - SECURED COLD STORAGE]");
    } else {
      navigator.clipboard.writeText(solanaMultiSigTreasuryAddress);
    }
    setCopiedSolanaTreasury(true);
    setTimeout(() => setCopiedSolanaTreasury(false), 2000);
  };

  // Calculate total aggregate Market Cap of all tokens currently in the session
  const { aggregateMarketCap, averageMarketCap, effectiveTokensCount } = useMemo(() => {
    const count =
      typeof totalTokensCount === "number" && totalTokensCount >= 0
        ? totalTokensCount
        : tokens
        ? tokens.length
        : 0;

    if (typeof totalMarketCap === "number") {
      return {
        aggregateMarketCap: totalMarketCap,
        averageMarketCap: count > 0 ? totalMarketCap / count : 0,
        effectiveTokensCount: count,
      };
    }

    if (tokens && tokens.length > 0) {
      const sum = tokens.reduce((acc, t) => acc + (Number(t.marketCap) || 0), 0);
      return {
        aggregateMarketCap: sum,
        averageMarketCap: sum / tokens.length,
        effectiveTokensCount: tokens.length,
      };
    }

    return { aggregateMarketCap: 0, averageMarketCap: 0, effectiveTokensCount: count };
  }, [tokens, totalMarketCap, totalTokensCount]);

  // Format financial valuation values into institutional compact and full dollar strings
  const formattedMarketCap = useMemo(() => {
    const val = aggregateMarketCap;
    if (isNaN(val) || val <= 0) {
      return {
        compact: "$0.00",
        full: "$0.00 USD",
        avgCompact: "$0.00",
      };
    }

    const full = `$${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;

    let compact = `$${val.toFixed(2)}`;
    if (val >= 1e15) {
      compact = `$${(val / 1e15).toFixed(2)}Q`;
    } else if (val >= 1e12) {
      compact = `$${(val / 1e12).toFixed(2)}T`;
    } else if (val >= 1e9) {
      compact = `$${(val / 1e9).toFixed(2)}B`;
    } else if (val >= 1e6) {
      compact = `$${(val / 1e6).toFixed(2)}M`;
    } else if (val >= 1e3) {
      compact = `$${(val / 1e3).toFixed(2)}K`;
    }

    const avg = averageMarketCap;
    let avgCompact = `$${avg.toFixed(2)}`;
    if (avg >= 1e12) {
      avgCompact = `$${(avg / 1e12).toFixed(2)}T`;
    } else if (avg >= 1e9) {
      avgCompact = `$${(avg / 1e9).toFixed(2)}B`;
    } else if (avg >= 1e6) {
      avgCompact = `$${(avg / 1e6).toFixed(2)}M`;
    } else if (avg >= 1e3) {
      avgCompact = `$${(avg / 1e3).toFixed(2)}K`;
    }

    return { compact, full, avgCompact };
  }, [aggregateMarketCap, averageMarketCap]);

  // Real-time Market Sentiment calculation based on aggregate performance metrics of all active tokens
  const marketSentiment = useMemo(() => {
    const list = tokens && tokens.length > 0 ? tokens : [];
    if (list.length === 0) {
      return {
        trend: "Neutral" as const,
        score: 50,
        label: "Market Standby",
        containerBorder: "border-slate-500/30 hover:border-slate-400/60",
        iconBg: "bg-slate-500/15",
        iconBorder: "border-slate-500/30",
        iconColor: "text-slate-400",
        textColor: "text-slate-300",
        dotColor: "bg-slate-400",
        icon: <Activity className="w-3.5 h-3.5 text-slate-400" />,
        breakdown: {
          avgSecurityScore: 0,
          auditedPercent: 0,
          deployedPercent: 0,
          highCapPercent: 0,
        },
      };
    }

    const total = list.length;
    let totalSecScore = 0;
    let auditedCount = 0;
    let deployedCount = 0;
    let highCapCount = 0;
    let pausedCount = 0;

    for (const t of list) {
      totalSecScore += t.securityScore || 0;
      if (
        t.launchStatus === "Audited" ||
        t.launchStatus === "Rug-Proof Vault" ||
        t.launchStatus === "Liquidity Locked" ||
        Boolean(t.auditFirm)
      ) {
        auditedCount++;
      }
      if (t.isDeployed || t.launchStatus === "Deployed") {
        deployedCount++;
      }
      if (t.launchStatus === "Paused") {
        pausedCount++;
      }
      if ((t.marketCap && t.marketCap >= 1_000_000_000) || t.isEnterprise) {
        highCapCount++;
      }
    }

    const avgSecurityScore = Math.round(totalSecScore / total);
    const auditedRatio = auditedCount / total;
    const deployedRatio = deployedCount / total;
    const highCapRatio = highCapCount / total;
    const pausedRatio = pausedCount / total;

    // Security health contribution (up to 30 pts)
    const secPoints = (avgSecurityScore / 100) * 30;

    // Audit and verified contract integrity (up to 25 pts)
    const auditPoints = auditedRatio * 25;

    // Sovereign and high-cap valuation (up to 25 pts)
    const capPoints = highCapRatio * 25;

    // Live deployment and execution readiness (up to 20 pts)
    const deployPoints = deployedRatio * 20;

    // Penalty for suspended or paused contracts (up to -20 pts)
    const penalty = pausedRatio * 20;

    const rawScore = Math.round(
      Math.max(10, Math.min(99, secPoints + auditPoints + capPoints + deployPoints - penalty))
    );

    let trend: "Bull" | "Bear" | "Neutral" = "Neutral";
    let label = "Neutral Consolidation";
    let containerBorder = "border-amber-500/30 hover:border-amber-400/60";
    let iconBg = "bg-amber-500/15";
    let iconBorder = "border-amber-500/30";
    let iconColor = "text-amber-400";
    let textColor = "text-amber-300";
    let dotColor = "bg-amber-400";
    let icon = <Activity className="w-3.5 h-3.5 text-amber-400" />;

    if (rawScore >= 65) {
      trend = "Bull";
      label = rawScore >= 80 ? "Strong Bull Run" : "Bullish Expansion";
      containerBorder = "border-emerald-500/30 hover:border-emerald-400/60";
      iconBg = "bg-emerald-500/15";
      iconBorder = "border-emerald-500/30";
      iconColor = "text-emerald-400";
      textColor = "text-emerald-300";
      dotColor = "bg-emerald-400";
      icon = <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    } else if (rawScore <= 45) {
      trend = "Bear";
      label = rawScore <= 30 ? "Deep Bear Cycle" : "Bearish Retraction";
      containerBorder = "border-rose-500/30 hover:border-rose-400/60";
      iconBg = "bg-rose-500/15";
      iconBorder = "border-rose-500/30";
      iconColor = "text-rose-400";
      textColor = "text-rose-300";
      dotColor = "bg-rose-400";
      icon = <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    }

    return {
      trend,
      score: rawScore,
      label,
      containerBorder,
      iconBg,
      iconBorder,
      iconColor,
      textColor,
      dotColor,
      icon,
      breakdown: {
        avgSecurityScore,
        auditedPercent: Math.round(auditedRatio * 100),
        deployedPercent: Math.round(deployedRatio * 100),
        highCapPercent: Math.round(highCapRatio * 100),
      },
    };
  }, [tokens]);

  return (
    <div className="bg-[#121216] border border-[#23232C] hover:border-[#F27D26]/40 rounded-xl p-4 shadow-lg transition-all space-y-3">
      {/* Top Header & Fast Global Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 border-b border-[#1E1E28] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-[#F27D26]/20 border border-amber-500/30 flex items-center justify-center text-base flex-shrink-0 shadow-[0_0_12px_rgba(242,125,38,0.2)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Sovereign Multi-Chain Authorities &amp; Treasuries
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                SYSTEM VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Designated EVM Deployer, Solana SPL Authority, Solana Multi-Sig Treasury, Base Chain Treasury (ID: {BASE_CHAIN_ID}), Polygon Treasury (ID: {POLYGON_CHAIN_ID}), and Protocol Multi-Sig Vault.
            </p>
          </div>
        </div>

        {/* Right Section: Mini-Stat Display & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mini-Stat Display: Session Aggregate Market Cap */}
          <div
            id="banner-session-market-cap-stat"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0E151B] border border-emerald-500/30 hover:border-emerald-400/60 shadow-sm transition-all group cursor-help select-none"
            title={`Session Aggregate Market Cap: ${formattedMarketCap.full}\nAverage per token: ${formattedMarketCap.avgCompact}\nComputed dynamically across all ${effectiveTokensCount.toLocaleString()} tokens in current session.`}
          >
            <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[#8E9299]">
                <span>Session Market Cap</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-bold font-mono text-emerald-300 tracking-tight">
                  {formattedMarketCap.compact}
                </span>
                <span className="text-[10px] font-mono text-[#8E9299]">
                  ({effectiveTokensCount.toLocaleString()} {effectiveTokensCount === 1 ? "token" : "tokens"})
                </span>
              </div>
            </div>
          </div>

          {/* Mini-Stat Display: Real-Time Market Sentiment Indicator (Bull/Bear/Neutral) */}
          <div
            id="banner-market-sentiment-indicator"
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0E151B] border ${marketSentiment.containerBorder} shadow-sm transition-all group cursor-help select-none`}
            title={`Real-Time Market Sentiment: ${marketSentiment.trend.toUpperCase()} (${marketSentiment.score}/100)\nRegime: ${marketSentiment.label}\n• Avg Security Score: ${marketSentiment.breakdown.avgSecurityScore}/100\n• Audited / Vault Secured: ${marketSentiment.breakdown.auditedPercent}%\n• Deployed to Chain: ${marketSentiment.breakdown.deployedPercent}%\n• High-Cap Allocation: ${marketSentiment.breakdown.highCapPercent}%\nEvaluated across all ${effectiveTokensCount.toLocaleString()} active session tokens.`}
          >
            <div
              className={`w-7 h-7 rounded-md ${marketSentiment.iconBg} border ${marketSentiment.iconBorder} flex items-center justify-center ${marketSentiment.iconColor} shrink-0 group-hover:scale-105 transition-transform shadow-sm`}
            >
              {marketSentiment.icon}
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[#8E9299]">
                <span>Market Sentiment</span>
                <span className={`w-1.5 h-1.5 rounded-full ${marketSentiment.dotColor} animate-pulse`} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xs sm:text-sm font-bold font-mono ${marketSentiment.textColor} tracking-tight`}>
                  {marketSentiment.trend.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-[#8E9299]">
                  ({marketSentiment.score}/100)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSyncAllTokensToDeployer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#22222C] border border-[#2E2E3C] hover:border-emerald-500/40 text-emerald-400 text-xs font-medium transition-all cursor-pointer active:scale-98"
            title="Update all tokens to use their corresponding Sovereign Deployer & Treasury"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sync All {totalTokensCount} Tokens</span>
          </button>

          {onGenerateSolanaTokens && (
            <button
              type="button"
              onClick={onGenerateSolanaTokens}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9945FF]/20 hover:bg-[#9945FF]/30 border border-[#9945FF]/50 text-[#14F195] text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
              title="Generate 50 Solana SPL tokens deployed by 2TTeGtPdU2g58QWUKzqneeVcson4a4mmB9PpCxAE4Gr6 and bound to Solana Multi-Sig Treasury"
            >
              <Sparkles className="w-3 h-3 text-[#14F195]" />
              <span>Generate 50 Solana SPL</span>
            </button>
          )}

          {onOpenMarketDeploy && (
            <button
              type="button"
              id="btn-banner-deploy-all-market"
              onClick={onOpenMarketDeploy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold font-mono transition-all shadow-md shadow-orange-950/40 active:scale-98 cursor-pointer"
              title="Deploy All Token Inventions to Blockchain Market (DEX AMM Pairs)"
            >
              <Rocket className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Deploy All to Market</span>
            </button>
          )}

          {onOpenGlobalSwapSell && (
            <button
              type="button"
              id="btn-banner-global-swap-sell"
              onClick={onOpenGlobalSwapSell}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono transition-all shadow-md shadow-cyan-950/40 active:scale-98 cursor-pointer"
              title="Universal Token Swap across 52 World Exchanges connected to Treasury ID 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Universal Swap (Treasury Synced)</span>
            </button>
          )}

          {onOpenPortfolio && (
            <button
              type="button"
              id="btn-banner-wallet-portfolio"
              onClick={onOpenPortfolio}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#181820] hover:bg-[#22222C] border border-[#2E2E3C] hover:border-amber-500/40 text-amber-300 text-xs font-semibold font-mono transition-all cursor-pointer active:scale-98 shadow-sm"
              title="Open Wallet Portfolio View synced with MetaMask"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>Wallet Portfolio</span>
            </button>
          )}

          {onOpenAtsExchange && (
            <button
              type="button"
              id="btn-banner-ats-exchange"
              onClick={onOpenAtsExchange}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-bold font-mono transition-all shadow-md shadow-amber-950/40 active:scale-98 cursor-pointer"
              title="Open Token World Exchange® Alternative Trading System (ATS) & NYSE Dual-Listing Exchange"
            >
              <Landmark className="w-3.5 h-3.5 text-black" />
              <span>ATS &amp; NYSE Venue</span>
            </button>
          )}

          {onOpenWeeklyTree3Update && (
            <button
              type="button"
              id="btn-banner-weekly-tree3-update"
              onClick={onOpenWeeklyTree3Update}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#221A0F] hover:bg-[#2F2212] border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold font-mono transition-all shadow-md shadow-amber-950/30 active:scale-98 cursor-pointer"
              title="Open Weekly TREE3 Update (Runs Every Monday - Oct 8 Edition)"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Weekly TREE3 (Oct 8)</span>
            </button>
          )}

          {onOpenWorldConnectivity && (
            <button
              type="button"
              id="btn-banner-world-connectivity"
              onClick={onOpenWorldConnectivity}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0E1520] hover:bg-[#152030] border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-bold font-mono transition-all shadow-sm active:scale-98 cursor-pointer"
              title="Open World Wide Web Connectivity: 8 Global Nodes, 10 Core Languages & Live Feeds"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
              <span>World Web (8 Nodes)</span>
            </button>
          )}

          {onOpenThreatScanner && (
            <button
              type="button"
              id="btn-banner-threat-scanner"
              onClick={onOpenThreatScanner}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E1116] hover:bg-[#2A141E] border border-rose-500/40 hover:border-rose-400 text-rose-300 text-xs font-bold font-mono transition-all shadow-md shadow-rose-950/30 active:scale-98 cursor-pointer"
              title="Open Security Threat Scanner: Heuristic Analysis across active batch"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Threat Scanner</span>
            </button>
          )}

          {onOpenMaoMaoTransfer && (
            <button
              type="button"
              id="btn-banner-maomao-transfer"
              onClick={onOpenMaoMaoTransfer}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#241A0B] hover:bg-[#342410] border border-amber-500/60 hover:border-amber-400 text-amber-300 text-xs font-bold font-mono transition-all shadow-md shadow-amber-950/40 active:scale-98 cursor-pointer"
              title="MetaMask Full Capacity: Send & Receive Mao-Mao ($MAOMAO)"
            >
              <span className="text-xs">🦊</span>
              <span>Mao-Mao Transfers</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGenerateWithDeployer}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8f3c] text-black text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
            title="Generate 100 new tokens deployed by active deployers and bound to treasury"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Generate 100 Multi-Chain</span>
          </button>

          <button
            type="button"
            onClick={onOpenMetaMaskSync}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all cursor-pointer active:scale-98 shadow-sm ${
              isMetaMaskConnected
                ? "bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/50 text-emerald-300"
                : "bg-[#181820] hover:bg-[#22222C] border-[#2E2E3C] hover:border-amber-500/40 text-amber-300"
            }`}
            title="Open MetaMask Secured Synchronization Studio (EIP-6963 + EIP-55 + Cryptographic Attestation)"
          >
            <span>🦊</span>
            <span>{isMetaMaskConnected ? "MetaMask Secured 🛡️" : "Enable MetaMask (Secured)"}</span>
          </button>
        </div>
      </div>

      {/* Real-time Multi-Chain Gas Estimator Widget */}
      <GasEstimatorWidget
        onTriggerDeployment={onOpenMarketDeploy || onGenerateWithDeployer}
      />

      {/* Sovereign Authority Cards: EVM, Solana Deployer, Solana Multi-Sig Treasury, Base Treasury, Polygon Treasury, and Universal Treasury */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* EVM Deployer Card */}
        <div className="bg-[#0D0D11] p-3 rounded-lg border border-[#22222C] flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🦊</span>
              <span className="text-[11px] font-bold text-white">EVM Sovereign Deployer</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              EIP-55
            </span>
          </div>

          <div className="font-mono text-[11px] text-amber-300 break-all select-all font-semibold bg-[#13131A] px-2 py-1 rounded border border-[#1E1E28]">
            {activeDeployerAddress}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCopyEvm}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedEvm ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={`https://etherscan.io/address/${activeDeployerAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#F27D26] hover:underline text-xs font-mono transition-colors"
            >
              <span>Etherscan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            {!isFoundryDefault && onResetToFoundryDeployer && (
              <button
                type="button"
                onClick={onResetToFoundryDeployer}
                className="text-[10px] text-amber-400 hover:underline font-mono ml-auto"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Solana Deployer Card */}
        <div className="bg-[#0D0D11] p-3 rounded-lg border border-[#22222C] flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">◎</span>
              <span className="text-[11px] font-bold text-white">Solana SPL Deployer</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              SVM Base58
            </span>
          </div>

          <div className="font-mono text-[11px] text-[#14F195] break-all select-all font-semibold bg-[#13131A] px-2 py-1 rounded border border-[#1E1E28]">
            {solanaDeployerAddress}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCopySolana}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedSolana ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={`https://solscan.io/account/${solanaDeployerAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-purple-300 hover:underline text-xs font-mono transition-colors"
            >
              <span>Solscan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href={`https://explorer.solana.com/address/${solanaDeployerAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors ml-auto"
            >
              <span>Explorer</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Solana Multi-Sig Treasury Card */}
        <div className="bg-[#0D0D11] p-3 rounded-lg border border-[#9945FF]/30 hover:border-[#14F195]/40 flex flex-col justify-between gap-2 shadow-[0_0_10px_rgba(153,69,255,0.08)] transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#9945FF] to-[#14F195] flex items-center justify-center text-[8px] font-bold text-black leading-none">
                ◎
              </span>
              <span className="text-[11px] font-bold text-white">Solana Multi-Sig Treasury</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-[#14F195] border border-[#14F195]/30 font-semibold">
              SVM Multi-Sig
            </span>
          </div>

          <div className="font-mono text-[11px] text-[#14F195] break-all select-all font-semibold bg-[#13131A] px-2 py-1 rounded border border-[#1E1E28] flex items-center justify-between gap-1">
            <span>
              {isTreasuryHiddenInVault
                ? "••••••••••••••••••••••••••••••••••••••••"
                : solanaMultiSigTreasuryAddress}
            </span>
            <span className="text-[9px] px-1 rounded bg-[#1F1F23] text-[#8E9299] shrink-0 font-sans">
              {isTreasuryHiddenInVault ? "Vault Hidden" : "SVM"}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setIsTreasuryHiddenInVault(!isTreasuryHiddenInVault)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
              title={isTreasuryHiddenInVault ? "Reveal Treasury Wallet ID" : "Hide Treasury Wallet ID in Vault"}
            >
              {isTreasuryHiddenInVault ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-cyan-400" />}
              <span>{isTreasuryHiddenInVault ? "Hidden" : "Revealed"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySolanaTreasury}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedSolanaTreasury ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={`https://solscan.io/account/${solanaMultiSigTreasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#14F195] hover:underline text-xs font-mono transition-colors"
            >
              <span>Solscan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href={`https://explorer.solana.com/address/${solanaMultiSigTreasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors ml-auto"
            >
              <span>Explorer</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Base Chain Treasury Card (Chain ID 8453) */}
        <div className="bg-[#0D0D11] p-3 rounded-lg border border-blue-500/30 flex flex-col justify-between gap-2 shadow-[0_0_10px_rgba(0,82,255,0.08)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0052FF] flex items-center justify-center text-[9px] font-bold text-white leading-none">
                B
              </span>
              <span className="text-[11px] font-bold text-white">Base Chain Treasury</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
              Chain ID: {BASE_CHAIN_ID}
            </span>
          </div>

          <div className="font-mono text-[11px] text-blue-300 break-all select-all font-semibold bg-[#13131A] px-2 py-1 rounded border border-[#1E1E28] flex items-center justify-between gap-1">
            <span>
              {isTreasuryHiddenInVault
                ? "••••••••••••••••••••••••••••••••••••••••"
                : baseTreasuryAddress}
            </span>
            <span className="text-[9px] px-1 rounded bg-[#1F1F23] text-[#8E9299] shrink-0 font-sans">
              {isTreasuryHiddenInVault ? "Vault Hidden" : "Base"}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setIsTreasuryHiddenInVault(!isTreasuryHiddenInVault)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
              title={isTreasuryHiddenInVault ? "Reveal Treasury Wallet ID" : "Hide Treasury Wallet ID in Vault"}
            >
              {isTreasuryHiddenInVault ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-cyan-400" />}
              <span>{isTreasuryHiddenInVault ? "Hidden" : "Revealed"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBaseTreasury}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedBaseTreasury ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={`https://basescan.org/address/${baseTreasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-blue-400 hover:underline text-xs font-mono transition-colors"
            >
              <span>Basescan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href={`https://app.safe.global/home?safe=base:${baseTreasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors ml-auto"
            >
              <span>Safe Base</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Polygon Chain Treasury Card (Chain ID 137) */}
        <div className="bg-[#0D0D11] p-3 rounded-lg border border-purple-500/30 flex flex-col justify-between gap-2 shadow-[0_0_10px_rgba(168,85,247,0.08)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#8247E5] flex items-center justify-center text-[9px] font-bold text-white leading-none">
                P
              </span>
              <span className="text-[11px] font-bold text-white">Polygon Treasury</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold">
              Chain ID: {POLYGON_CHAIN_ID}
            </span>
          </div>

          <div className="font-mono text-[11px] text-purple-300 break-all select-all font-semibold bg-[#13131A] px-2 py-1 rounded border border-[#1E1E28] flex items-center justify-between gap-1">
            <span>
              {isTreasuryHiddenInVault
                ? "••••••••••••••••••••••••••••••••••••••••"
                : polygonTreasuryAddress}
            </span>
            <span className="text-[9px] px-1 rounded bg-[#1F1F23] text-[#8E9299] shrink-0 font-sans">
              {isTreasuryHiddenInVault ? "Vault Hidden" : "POL"}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setIsTreasuryHiddenInVault(!isTreasuryHiddenInVault)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
              title={isTreasuryHiddenInVault ? "Reveal Treasury Wallet ID" : "Hide Treasury Wallet ID in Vault"}
            >
              {isTreasuryHiddenInVault ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-cyan-400" />}
              <span>{isTreasuryHiddenInVault ? "Hidden" : "Revealed"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPolygonTreasury}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedPolygonTreasury ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={`https://polygonscan.com/address/${polygonTreasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-purple-400 hover:underline text-xs font-mono transition-colors"
            >
              <span>Polygonscan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href={`https://app.safe.global/home?safe=matic:${polygonTreasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors ml-auto"
            >
              <span>Safe Polygon</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Universal Protocol Treasury Vault Card */}
        <div className="bg-[#0D0D11] p-3 rounded-lg border border-[#22222C] flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold text-white">Universal Swap Treasury</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Universal Swap Router
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {isTreasuryHiddenInVault ? "Vault Protected: Hidden" : "Vault Revealed"}
              </span>
            </div>
          </div>

          <div className="font-mono text-[11px] text-cyan-300 break-all select-all font-semibold bg-[#13131A] px-2 py-1 rounded border border-[#1E1E28] flex items-center justify-between gap-1">
            <span>
              {isTreasuryHiddenInVault
                ? "••••••••••••••••••••••••••••••••••••••••"
                : treasuryAddress}
            </span>
            <span className="text-[9px] px-1 rounded bg-[#1F1F23] text-[#8E9299] shrink-0 font-sans">
              {isTreasuryHiddenInVault ? "Vault Hidden" : "Treasury ID"}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setIsTreasuryHiddenInVault(!isTreasuryHiddenInVault)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
              title={isTreasuryHiddenInVault ? "Reveal Treasury Wallet ID" : "Hide Treasury Wallet ID in Vault"}
            >
              {isTreasuryHiddenInVault ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-cyan-400" />}
              <span>{isTreasuryHiddenInVault ? "Hidden in Vault" : "Revealed"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTreasury}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedTreasury ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={`https://etherscan.io/address/${treasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-cyan-300 hover:underline text-xs font-mono transition-colors"
            >
              <span>Etherscan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href={`https://app.safe.global/home?safe=eth:${treasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1A22] hover:bg-[#252530] border border-[#2F2F3D] text-[#8E9299] hover:text-white text-xs font-mono transition-colors ml-auto"
            >
              <span>Safe App</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};



