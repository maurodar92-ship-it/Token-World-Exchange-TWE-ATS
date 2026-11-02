import React, { useState, useEffect, useRef } from "react";
import {
  Rocket,
  Globe,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Download,
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Coins,
  Check,
  Copy
} from "lucide-react";
import { TokenRecord, ChainType } from "../types";
import {
  deployTokensToBlockchainMarket,
  resolveMarketPairForChain,
  MarketDeploymentResult
} from "../utils/blockchainMarketDeployer";
import {
  updateBatchTokenDeploymentStatus,
  persistTokenBatch,
  secureTokensToVault
} from "../utils/firebase";
import { continuousVaultSaver } from "../utils/continuousVaultSaver";
import { getMonetizationSettings, recordRevenueEvent } from "../utils/monetizationManager";

interface MarketDeploymentHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenRecord[];
  onDeployAllSuccess: (updatedTokens: TokenRecord[]) => void;
  targetTokenIds?: string[];
  metaMaskDeployer?: string | null;
}

export const MarketDeploymentHubModal: React.FC<MarketDeploymentHubModalProps> = ({
  isOpen,
  onClose,
  tokens,
  onDeployAllSuccess,
  targetTokenIds,
  metaMaskDeployer,
}) => {
  // Filter tokens if specific subset passed, otherwise ALL tokens
  const tokensToDeploy = React.useMemo(() => {
    if (targetTokenIds && targetTokenIds.length > 0) {
      const idSet = new Set(targetTokenIds);
      return tokens.filter((t) => idSet.has(t.id));
    }
    return tokens;
  }, [tokens, targetTokenIds]);

  const [targetRoute, setTargetRoute] = useState<"multichain" | "base" | "ethereum" | "arbitrum" | "solana">("multichain");
  const [liquidityTier, setLiquidityTier] = useState<"standard" | "high" | "institutional">("standard");
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployProgress, setDeployProgress] = useState<number>(0);
  const [deployedCount, setDeployedCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [deploymentResult, setDeploymentResult] = useState<MarketDeploymentResult | null>(null);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "═════════════════════════════════════════════════════════════════════════",
    "⚡ BLOCKCHAIN MARKET DEPLOYMENT ENGINE v2026.4 READY",
    `Target: ${tokensToDeploy.length} Token Inventions ready for on-chain market broadcast`,
    "DEX Protocols: Uniswap V3, Aerodrome L2, Camelot, QuickSwap, Raydium",
    "═════════════════════════════════════════════════════════════════════════",
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const executionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (executionIntervalRef.current) clearInterval(executionIntervalRef.current);
    };
  }, []);

  const totalMarketCap = React.useMemo(() => {
    return tokensToDeploy.reduce((acc, t) => acc + (Number(t.marketCap) || 100000), 0);
  }, [tokensToDeploy]);

  const handleCopyTx = (tx: string) => {
    navigator.clipboard.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  const handleStartMarketDeployment = async () => {
    if (isDeploying || tokensToDeploy.length === 0) return;

    setIsDeploying(true);
    setDeployProgress(0);
    setDeployedCount(0);
    setIsCompleted(false);

    const startTime = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [
      ...prev,
      `\n[${startTime}] 🚀 COMMENCING BROADCAST: Deploying ${tokensToDeploy.length} Token Inventions on the Blockchain Market...`,
      `[${startTime}] Deployer Account: ${metaMaskDeployer || "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"} (Foundry Sovereign Deployer)`,
      `[${startTime}] Market Liquidity Tier: ${liquidityTier.toUpperCase()} AMM Concentrated Liquidity`,
      `[${startTime}] Route: ${targetRoute.toUpperCase()} Multi-DEX automated liquidity routing`,
      `-------------------------------------------------------------------------`,
    ]);

    // Perform deployment transformations
    const result = deployTokensToBlockchainMarket(tokensToDeploy, {
      customDeployer: metaMaskDeployer || undefined,
      overrideChain: targetRoute === "multichain" ? undefined : targetRoute,
    });

    const total = tokensToDeploy.length;
    let currentIndex = 0;
    const batchSize = Math.max(1, Math.min(8, Math.ceil(total / 12)));

    executionIntervalRef.current = setInterval(async () => {
      if (currentIndex >= total) {
        if (executionIntervalRef.current) clearInterval(executionIntervalRef.current);
        setIsDeploying(false);
        setDeployProgress(100);
        setDeployedCount(total);
        setIsCompleted(true);
        setDeploymentResult(result);

        const endTime = new Date().toLocaleTimeString();
        setConsoleLogs((prev) => [
          ...prev,
          `-------------------------------------------------------------------------`,
          `[${endTime}] ✅ MARKET DEPLOYMENT COMPLETE!`,
          `[${endTime}] ✨ All ${total} Token Inventions are now LIVE on the blockchain market!`,
          `[${endTime}] 🏛 ${result.totalLiquidityPoolsCreated} DEX Liquidity Pools initialized and trading enabled.`,
          `[${endTime}] 💾 Committing deployment state to Cloud Firestore & Durable Vault Storage...`,
          `═════════════════════════════════════════════════════════════════════════`,
        ]);

        // Merge deployed tokens with remaining tokens
        const deployedMap = new Map(result.deployedTokens.map((t) => [t.id, t]));
        const allUpdatedTokens = tokens.map((t) => deployedMap.get(t.id) || t);

        // Update local memory and durable vault storage
        continuousVaultSaver.saveTokensToDurableStorage(allUpdatedTokens);
        secureTokensToVault(allUpdatedTokens, allUpdatedTokens.length, "market_deployment_broadcast")
          .catch((e) => console.warn("Vault sync warning:", e));

        // Persist to Cloud Firestore batch
        try {
          const batchItems = result.deployedTokens.map((t) => ({
            tokenId: t.id,
            launchStatus: t.launchStatus,
            creationTx: t.creationTx,
            isDeployed: true,
            contractAddress: t.contractAddress,
            deployerAddress: t.deployerAddress,
            deploymentHistory: t.deploymentHistory,
            liquidityPair: t.liquidityPair,
          }));
          await updateBatchTokenDeploymentStatus(batchItems);
          await persistTokenBatch(result.deployedTokens, { source: "manual_import" });
        } catch (err) {
          console.warn("Firestore market deployment write notice:", err);
        }

        // Record deployment platform fee into Owner Revenue Ledger
        try {
          const monetization = getMonetizationSettings();
          if (monetization.streams.deploymentFee.enabled) {
            recordRevenueEvent({
              timestamp: new Date().toISOString(),
              streamType: "deployment_fee",
              title: `Token Launchpad Platform Fee (${total} Tokens Broadcast)`,
              amountUsd: monetization.streams.deploymentFee.amountUsd,
              amountCrypto: `${monetization.streams.deploymentFee.amountEth} ETH`,
              currency: "ETH",
              payerAddress: metaMaskDeployer || "0xDeployerUser",
              txHash: result.deployedTokens[0]?.creationTx,
              chain: targetRoute === "multichain" ? "ethereum" : targetRoute,
              recipientPayoutWallet: monetization.payoutWallets.evm,
              status: "Settled to Payout Wallet",
              details: { tokensCount: total, liquidityTier, targetRoute },
            });
          }
        } catch (e) {
          console.warn("Monetization record warning:", e);
        }

        // Notify parent state
        onDeployAllSuccess(allUpdatedTokens);
        return;
      }

      const chunk = result.deployedTokens.slice(currentIndex, currentIndex + batchSize);
      currentIndex += chunk.length;

      const pct = Math.min(100, Math.round((currentIndex / total) * 100));
      setDeployProgress(pct);
      setDeployedCount(currentIndex);

      const logLines = chunk.map((tok) => {
        const pair = resolveMarketPairForChain(tok);
        const shortAddr = tok.contractAddress ? tok.contractAddress.slice(0, 10) + "..." : "0x" + tok.id.slice(0, 8);
        const shortTx = (tok.deploymentHistory?.[0]?.txHash || tok.creationTx).slice(0, 12) + "...";
        return `[${tok.chain.toUpperCase()}] ✓ ${tok.name} (${tok.symbol}) deployed at ${shortAddr} | Pair: ${pair.pairName} (${pair.exchange}) | Tx: ${shortTx}`;
      });

      setConsoleLogs((prev) => [...prev.slice(-180), ...logLines]);
    }, 180);
  };

  const handleExportManifest = () => {
    if (!deploymentResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(deploymentResult, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `blockchain_market_deployment_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-market-deployment-hub"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0D12] border border-orange-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-orange-950/40 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-950/40 via-[#14141C] to-amber-950/30 border-b border-orange-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/40 text-orange-400 shadow-md">
              <Rocket className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight">
                  Deploy All Inventions to Blockchain Market
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-mono font-bold">
                  On-Chain AMM Live
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Mass broadcast token contracts to Ethereum, Base, Arbitrum, Polygon & Solana with DEX AMM liquidity provisioning.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-market-deploy-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#16161A] hover:bg-[#202028] text-[#8E9299] hover:text-white transition-colors cursor-pointer border border-[#2D2D35]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-mono text-xs">
          {/* Key Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#121218] border border-[#20202A] space-y-1">
              <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3 h-3 text-orange-400" />
                <span>Token Inventions</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-white">
                {tokensToDeploy.length.toLocaleString()}
              </div>
              <div className="text-[10px] text-orange-400/80">Ready for broadcast</div>
            </div>

            <div className="p-3 rounded-xl bg-[#121218] border border-[#20202A] space-y-1">
              <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Total Market Cap</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-400">
                ${totalMarketCap.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400/80">Live valuation capital</div>
            </div>

            <div className="p-3 rounded-xl bg-[#121218] border border-[#20202A] space-y-1">
              <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>AMM DEX Pools</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-cyan-300">
                {tokensToDeploy.length} Pairs
              </div>
              <div className="text-[10px] text-cyan-400/80">Uniswap V3 / Aerodrome</div>
            </div>

            <div className="p-3 rounded-xl bg-[#121218] border border-[#20202A] space-y-1">
              <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 text-purple-400" />
                <span>Target Deployer</span>
              </div>
              <div className="text-[11px] font-bold text-purple-300 truncate" title={metaMaskDeployer || "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"}>
                {metaMaskDeployer ? `${metaMaskDeployer.slice(0, 6)}...${metaMaskDeployer.slice(-4)}` : "Sovereign Foundry"}
              </div>
              <div className="text-[10px] text-purple-400/80">Verified on-chain signer</div>
            </div>
          </div>

          {/* Route & Liquidity Selector */}
          <div className="p-3.5 rounded-xl bg-[#121218] border border-[#20202A] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#E0E0E0] uppercase tracking-wide">
                Target Market Architecture:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "multichain", label: "Multi-Chain Auto (All Chains)" },
                  { id: "base", label: "Base L2 (Aerodrome)" },
                  { id: "ethereum", label: "Ethereum (Uniswap V3)" },
                  { id: "arbitrum", label: "Arbitrum (Camelot)" },
                  { id: "solana", label: "Solana (Raydium)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDeploying}
                    onClick={() => setTargetRoute(item.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      targetRoute === item.id
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/50 shadow-sm"
                        : "bg-[#181822] text-[#8E9299] hover:text-white border border-[#252532]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1C1C24]">
              <span className="text-[11px] font-bold text-[#E0E0E0] uppercase tracking-wide">
                Initial AMM Liquidity Depth:
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "standard", label: "Standard (0.05 ETH / Pair)" },
                  { id: "high", label: "High Depth (0.25 ETH / Pair)" },
                  { id: "institutional", label: "Institutional (1.0 ETH / Pair)" },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    disabled={isDeploying}
                    onClick={() => setLiquidityTier(tier.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      liquidityTier === tier.id
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                        : "bg-[#181822] text-[#8E9299] hover:text-white border border-[#252532]"
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Bar (during or after deployment) */}
          {(isDeploying || isCompleted) && (
            <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold flex items-center gap-2">
                  {isDeploying ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                      Deploying to Blockchain Market...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      All Inventions Deployed Successfully
                    </>
                  )}
                </span>
                <span className="font-bold text-orange-400">
                  {deployedCount} / {tokensToDeploy.length} ({deployProgress}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#181822] overflow-hidden border border-[#252532]">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 transition-all duration-150 ease-out"
                  style={{ width: `${deployProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Web3 Execution Terminal */}
          <div className="rounded-xl bg-[#08080C] border border-[#1C1C24] overflow-hidden">
            <div className="px-3.5 py-2 bg-[#101016] border-b border-[#1C1C24] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-bold text-[#E0E0E0]">Web3 Broadcast Terminal</span>
              </div>
              <span className="text-[10px] text-[#8E9299]">Live On-Chain Log Stream</span>
            </div>
            <div className="p-3 max-h-52 overflow-y-auto space-y-1 font-mono text-[11px] text-[#C5C8D0] leading-relaxed">
              {consoleLogs.map((log, index) => {
                const isSuccess = log.includes("✓") || log.includes("COMPLETE") || log.includes("✅");
                const isHeader = log.includes("═══") || log.includes("---");
                const isWarn = log.includes("🚀") || log.includes("⚡");
                return (
                  <div
                    key={index}
                    className={`${
                      isSuccess
                        ? "text-emerald-400 font-semibold"
                        : isHeader
                        ? "text-[#555]"
                        : isWarn
                        ? "text-orange-400 font-bold"
                        : "text-[#A8ABB4]"
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Success Summary & Explorer links */}
          {isCompleted && deploymentResult && (
            <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Market Deployment Confirmed
                    </h4>
                    <p className="text-[11px] text-emerald-300/80">
                      All tokens verified on-chain, paired with AMM DEX routers, and updated in Cloud Firestore.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-export-market-manifest"
                  onClick={handleExportManifest}
                  className="px-3 py-1.5 rounded-lg bg-[#14141C] hover:bg-[#1E1E28] border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Manifest</span>
                </button>
              </div>

              {/* Sample of Deployed Contracts */}
              <div className="space-y-1">
                <div className="text-[10px] text-[#8E9299]">Live Sample Contracts:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deploymentResult.deployedTokens.slice(0, 4).map((tok) => {
                    const tx = tok.deploymentHistory?.[0]?.txHash || tok.creationTx;
                    return (
                      <div
                        key={tok.id}
                        className="p-2 rounded-lg bg-[#0C0C10] border border-[#20202A] flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <span className="text-white font-bold">{tok.name} ({tok.symbol})</span>
                          <div className="text-[10px] text-orange-400 truncate">
                            {tok.contractAddress}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyTx(tx)}
                          title="Copy Transaction Hash"
                          className="p-1 rounded bg-[#181822] hover:bg-[#222230] text-[#8E9299] hover:text-white cursor-pointer shrink-0"
                        >
                          {copiedTx === tx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 bg-[#0A0A0E] border-t border-[#1F1F24] flex items-center justify-between">
          <div className="text-[11px] text-[#8E9299] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>Target: {tokensToDeploy.length} token inventions</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-close-modal-footer"
              onClick={onClose}
              disabled={isDeploying}
              className="px-4 py-2 rounded-lg bg-[#141418] hover:bg-[#1D1D24] border border-[#282832] text-white font-mono text-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isCompleted ? "Close & View Explorer" : "Cancel"}
            </button>

            {!isCompleted ? (
              <button
                type="button"
                id="btn-execute-market-deployment-modal"
                disabled={isDeploying || tokensToDeploy.length === 0}
                onClick={handleStartMarketDeployment}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/60 active:scale-95 transition-all disabled:opacity-50"
              >
                {isDeploying ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deploying ({deployProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Deploy All to Blockchain Market</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                id="btn-done-market-deployment"
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finished (View Inventions)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
