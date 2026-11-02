import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Layers,
  TrendingUp,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ExternalLink,
  Copy,
  Check,
  ArrowRightLeft,
  Coins,
  Scale,
  Zap,
  Building2,
  Clock,
  Server,
  UserCheck,
  Globe,
  RefreshCw,
  Plus,
  Play,
  RotateCcw,
  Sliders,
  Hash,
} from "lucide-react";
import {
  globalOnChainAtsEngine,
  InvestorIdentitySBTRecord,
  EnterpriseRollupNetwork,
  PreExecutionGateResult,
  OnChainOrderRecord,
  AtomicClearingReceipt,
  ENTERPRISE_ROLLUPS,
} from "../utils/onChainAtsEngine";
import { InvestorSBTGallery } from "./InvestorSBTGallery";

interface OnChainInstitutionalOrderBookAndClearinghouseProps {
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
}

type ViewSubTab = "clob_engine" | "clearinghouse_sbt" | "smart_contracts";

export const OnChainInstitutionalOrderBookAndClearinghouse: React.FC<
  OnChainInstitutionalOrderBookAndClearinghouseProps
> = ({ metaMaskAccount, isMetaMaskConnected }) => {
  const [activeSubTab, setActiveSubTab] = useState<ViewSubTab>("clob_engine");
  const [selectedNetwork, setSelectedNetwork] = useState<EnterpriseRollupNetwork>(
    globalOnChainAtsEngine.getSelectedNetwork()
  );

  // CLOB Order Ticket State
  const [traderAccountIndex, setTraderAccountIndex] = useState<number>(0);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("TW-EQ");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderPrice, setOrderPrice] = useState<string>("52.50");
  const [orderQuantity, setOrderQuantity] = useState<string>("10000");
  const [preTradeGateResult, setPreTradeGateResult] = useState<PreExecutionGateResult | null>(null);
  const [isEvaluatingHook, setIsEvaluatingHook] = useState<boolean>(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Clearinghouse DvP Simulator State
  const [buyerIndex, setBuyerIndex] = useState<number>(0);
  const [sellerIndex, setSellerIndex] = useState<number>(1);
  const [settlementShares, setSettlementShares] = useState<string>("5000");
  const [settlementPrice, setSettlementPrice] = useState<string>("52.50");
  const [settlementNotice, setSettlementNotice] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState<boolean>(false);

  // Minter Modal State
  const [showMintModal, setShowMintModal] = useState<boolean>(false);
  const [mintWallet, setMintWallet] = useState<string>(
    metaMaskAccount || "0x99A8c12093847102938471029384710293847102"
  );
  const [mintEntityName, setMintEntityName] = useState<string>("Apollo Global Institutional Credit SPV");
  const [mintJurisdiction, setMintJurisdiction] = useState<number>(840);
  const [mintTier, setMintTier] = useState<number>(2);
  const [copiedContractKey, setCopiedContractKey] = useState<string | null>(null);
  const [selectedContractKey, setSelectedContractKey] = useState<
    "identity_sbt" | "compliance_hook" | "orderbook" | "clearinghouse"
  >("identity_sbt");

  // Refresh trigger
  const [refreshNonce, setRefreshNonce] = useState<number>(0);
  const refreshState = () => setRefreshNonce((p) => p + 1);

  // Cached data
  const investorNfts = useMemo(
    () => globalOnChainAtsEngine.getInvestorNfts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshNonce]
  );
  const activeOrders = useMemo(
    () => globalOnChainAtsEngine.getActiveOrders(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshNonce]
  );
  const settlements = useMemo(
    () => globalOnChainAtsEngine.getSettlementHistory(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshNonce]
  );

  const activeTrader = investorNfts[traderAccountIndex] || investorNfts[0];
  const activeBuyer = investorNfts[buyerIndex] || investorNfts[0];
  const activeSeller = investorNfts[sellerIndex] || investorNfts[1];

  const handleNetworkChange = (netId: string) => {
    globalOnChainAtsEngine.setSelectedNetwork(netId);
    setSelectedNetwork(globalOnChainAtsEngine.getSelectedNetwork());
  };

  const handleRunPreTradeCheckOnly = () => {
    setIsEvaluatingHook(true);
    setTimeout(() => {
      const res = globalOnChainAtsEngine.evaluatePreTradeCompliance({
        traderAddress: activeTrader.walletAddress,
        symbol: selectedSymbol,
        side: orderSide,
        priceUsd: parseFloat(orderPrice) || 52.5,
        quantityShares: parseInt(orderQuantity, 10) || 10000,
        referenceMarkPriceUsd: selectedSymbol === "TREE3" ? 125.0 : 52.5,
      });
      setPreTradeGateResult(res);
      setIsEvaluatingHook(false);
    }, 200);
  };

  const handlePlaceOnChainOrder = () => {
    const qty = parseInt(orderQuantity, 10);
    const px = parseFloat(orderPrice);
    if (!qty || !px) return;

    const res = globalOnChainAtsEngine.submitOnChainOrder({
      traderAddress: activeTrader.walletAddress,
      symbol: selectedSymbol,
      side: orderSide,
      priceUsd: px,
      quantityShares: qty,
      networkId: selectedNetwork.id,
    });

    setPreTradeGateResult(res.gateResult);

    if (res.success && res.order) {
      setOrderNotice(
        `ORDER CONFIRMED on ${selectedNetwork.name}! Block included in ${selectedNetwork.blockTimeMs}ms (Tx: ${res.order.txHash.slice(0, 10)}...)`
      );
      refreshState();
      setTimeout(() => setOrderNotice(null), 6000);
    } else {
      setOrderNotice(`ORDER REJECTED by Pre-Trade Hook: ${res.gateResult.failureReason}`);
      setTimeout(() => setOrderNotice(null), 8000);
    }
  };

  const handleExecuteAtomicSettlement = () => {
    setIsSettling(true);
    setTimeout(() => {
      const shares = parseInt(settlementShares, 10) || 5000;
      const px = parseFloat(settlementPrice) || 52.5;

      const res = globalOnChainAtsEngine.clearAndSettleAtomicDvP({
        buyerAddress: activeBuyer.walletAddress,
        sellerAddress: activeSeller.walletAddress,
        assetSymbol: selectedSymbol,
        sharesCleared: shares,
        pricePerShareUsd: px,
        network: selectedNetwork.name,
      });

      setIsSettling(false);

      if (res.success && res.receipt) {
        setSettlementNotice(
          `ATOMIC DvP CLEARED! $${res.receipt.totalConsiderationUsd.toLocaleString()} settled on-chain. Proof Hash: ${res.receipt.clearanceProofHash.slice(0, 14)}...`
        );
        refreshState();
        setTimeout(() => setSettlementNotice(null), 7000);
      } else {
        setSettlementNotice(`SETTLEMENT REVERTED: ${res.failureReason}`);
        setTimeout(() => setSettlementNotice(null), 8000);
      }
    }, 250);
  };

  const handleMintCustomNft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintWallet) return;

    globalOnChainAtsEngine.issueInvestorNft({
      walletAddress: mintWallet,
      entityName: mintEntityName,
      jurisdictionCode: Number(mintJurisdiction),
      accreditationTier: Number(mintTier),
    });

    setShowMintModal(false);
    refreshState();
  };

  const handleCopyCode = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedContractKey(key);
    setTimeout(() => setCopiedContractKey(null), 2000);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner: Enterprise Rollup Telemetry & Architecture Spec */}
      <div className="bg-gradient-to-r from-[#0F1422] via-[#141A2D] to-[#0F1422] border border-[#212A45] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
                Architecture Option 2 · On-Chain CLOB
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                Tokenomics Option 3 · KYC/AML Clearinghouse (ERC-5192)
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                Sub-Second Block Time ({selectedNetwork.blockTimeMs}ms)
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
              <Cpu className="w-6 h-6 text-cyan-400" />
              On-Chain Institutional Order Book &amp; Multi-Jurisdictional Clearinghouse
            </h2>

            <p className="text-xs text-slate-400 max-w-3xl mt-1">
              Decentralized limit order book on enterprise L2/L3 rollups with pre-execution smart contract compliance hooks
              and automated atomic DvP clearing cross-referencing non-transferable ERC-5192 Investor Identity NFTs.
            </p>
          </div>

          {/* Rollup Network Selector */}
          <div className="bg-[#0A0D16] border border-[#1E253E] rounded-xl p-3 shrink-0 space-y-2">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Active Execution Layer</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sequencer: Optimal
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ENTERPRISE_ROLLUPS.map((rollup) => {
                const isSelected = selectedNetwork.id === rollup.id;
                return (
                  <button
                    key={rollup.id}
                    type="button"
                    onClick={() => handleNetworkChange(rollup.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left border ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-400 text-white shadow-sm font-semibold"
                        : "bg-[#111626] border-[#1C233C] text-slate-400 hover:text-slate-200 hover:bg-[#161C30]"
                    }`}
                  >
                    <div className="text-[11px] font-medium">{rollup.name}</div>
                    <div className="text-[9px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{rollup.blockTimeMs}ms Block</span>
                      <span>·</span>
                      <span>${rollup.avgGasUsd} Gas</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#1C233C] overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("clob_engine")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === "clob_engine"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                : "bg-[#111626] text-slate-300 hover:text-white border border-[#1E2640]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. On-Chain CLOB &amp; Pre-Execution Gate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("clearinghouse_sbt")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === "clearinghouse_sbt"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "bg-[#111626] text-slate-300 hover:text-white border border-[#1E2640]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2. KYC/AML Clearinghouse (ERC-5192 SBTs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("smart_contracts")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === "smart_contracts"
                ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                : "bg-[#111626] text-slate-300 hover:text-white border border-[#1E2640]"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>3. Solidity Smart Contracts &amp; ABIs</span>
          </button>
        </div>
      </div>

      {/* NOTICES */}
      {orderNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 animate-in fade-in ${
            orderNotice.includes("CONFIRMED")
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/30 border-rose-500/40 text-rose-300"
          }`}
        >
          {orderNotice.includes("CONFIRMED") ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{orderNotice}</span>
        </div>
      )}

      {settlementNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 animate-in fade-in ${
            settlementNotice.includes("CLEARED")
              ? "bg-purple-950/30 border-purple-500/40 text-purple-300"
              : "bg-rose-950/30 border-rose-500/40 text-rose-300"
          }`}
        >
          {settlementNotice.includes("CLEARED") ? (
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{settlementNotice}</span>
        </div>
      )}

      {/* SUB-TAB 1: ON-CHAIN CLOB & PRE-EXECUTION COMPLIANCE GATE */}
      {activeSubTab === "clob_engine" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): Order Entry Ticket with Pre-Trade Hook Interceptor */}
          <div className="lg:col-span-5 bg-[#101420] border border-[#1C2338] rounded-2xl p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Pre-Trade Hook Interceptor Ticket
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                  IPreTradeComplianceHook
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every order placement is intercepted by the on-chain compliance hook before insertion into the CLOB.
              </p>
            </div>

            {/* Select Signing Trader Account */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
                <span>Signing Wallet Profile (ERC-5192 SBT)</span>
                <span className="text-[10px] text-amber-400">Select to test pass/fail</span>
              </label>

              <select
                value={traderAccountIndex}
                onChange={(e) => {
                  setTraderAccountIndex(Number(e.target.value));
                  setPreTradeGateResult(null);
                }}
                className="w-full bg-[#0A0D16] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                {investorNfts.map((nft, idx) => (
                  <option key={nft.tokenId} value={idx}>
                    {nft.entityName} ({nft.countryCode} · {nft.tierLabel}) {nft.isRevoked ? "⛔ REVOKED" : "✅ VERIFIED"}
                  </option>
                ))}
              </select>

              <div className="p-2.5 rounded-xl bg-[#0B0E17] border border-[#1B2236] text-[11px] font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Wallet Address:</span>
                  <span className="text-white">
                    {activeTrader.walletAddress.slice(0, 10)}...{activeTrader.walletAddress.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Accreditation Standard:</span>
                  <span className="text-cyan-300 font-semibold">{activeTrader.jurisdictionLabel}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Soulbound Token ID:</span>
                  <span className="text-purple-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    SBT #{activeTrader.tokenId} (ERC-5192 Locked)
                  </span>
                </div>
              </div>
            </div>

            {/* Symbol & Order Configuration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Security Token</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-[#0A0D16] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="TW-EQ">TW-EQ (NYSE Dual-Listing)</option>
                  <option value="TREE3">TREE3 (Sovereign Token)</option>
                  <option value="SPX-EQ">SPX-EQ (Pre-IPO Equity)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Order Side</label>
                <div className="grid grid-cols-2 gap-1 bg-[#0A0D16] p-1 rounded-xl border border-[#232B44]">
                  <button
                    type="button"
                    onClick={() => setOrderSide("BUY")}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      orderSide === "BUY"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide("SELL")}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      orderSide === "SELL"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>
            </div>

            {/* Price & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Limit Price (USD)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  className="w-full bg-[#0A0D16] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Quantity (Shares)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="w-full bg-[#0A0D16] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Consideration Value */}
            <div className="p-3 rounded-xl bg-[#0E121E] border border-[#1E253A] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Total Consideration:</span>
              <span className="text-white font-bold text-sm">
                ${((parseFloat(orderPrice) || 0) * (parseInt(orderQuantity, 10) || 0)).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Action Buttons: Simulate Hook vs Submit */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRunPreTradeCheckOnly}
                disabled={isEvaluatingHook}
                className="py-2.5 px-3 rounded-xl bg-[#161C2E] hover:bg-[#1E263E] border border-[#2B3554] text-xs font-mono text-cyan-300 font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isEvaluatingHook ? "Evaluating Hook..." : "Simulate Hook"}</span>
              </button>

              <button
                type="button"
                onClick={handlePlaceOnChainOrder}
                className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 ${
                  orderSide === "BUY"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-950/40"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Submit to On-Chain CLOB</span>
              </button>
            </div>

            {/* Live Hook Interceptor Evaluation Breakdown */}
            {preTradeGateResult && (
              <div className="p-3.5 rounded-xl border bg-[#0B0E18] space-y-2.5 animate-in slide-in-from-top-1 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#1C2338] pb-2">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Pre-Trade Hook Gatekeeper Verdict
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      preTradeGateResult.approved
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {preTradeGateResult.approved ? "APPROVED FOR MEMPOOL" : "REJECTED BY HOOK"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {preTradeGateResult.stages.map((stage) => (
                    <div
                      key={stage.code}
                      className="p-2 rounded-lg bg-[#101422] border border-[#192034] text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold flex items-center gap-1.5">
                          {stage.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          {stage.name}
                        </span>
                        <span className="text-[10px] text-slate-400">{stage.latencyMs}ms</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 pl-5">{stage.details}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#1C2338]">
                  <span>Evaluated Gas Cost: {preTradeGateResult.evaluatedGasUnits} Gas</span>
                  <span className="truncate max-w-[180px]">Hash: {preTradeGateResult.executionHash.slice(0, 14)}...</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (7 cols): Live On-Chain Order Book & Ladder */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#101420] border border-[#1C2338] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2338] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    On-Chain Central Limit Order Book (CLOB)
                  </h3>
                  <div className="text-xs text-slate-400">
                    Enterprise Layer: <strong className="text-cyan-400 font-mono">{selectedNetwork.name}</strong> · Sub-Second Block Time: {selectedNetwork.blockTimeMs}ms
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#161C2C] border border-[#232C46] text-xs font-mono text-slate-300">
                    Active Symbol: <strong className="text-amber-400">{selectedSymbol}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={refreshState}
                    className="p-1.5 rounded-lg bg-[#161C2C] hover:bg-[#202840] text-slate-300 border border-[#232C46]"
                    title="Refresh on-chain book"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Order Book Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0A0D16] text-slate-400 border-b border-[#1C2338]">
                    <tr>
                      <th className="py-2.5 px-3">Order ID / Tx</th>
                      <th className="py-2.5 px-3">Participant &amp; Tier</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182034]">
                    {activeOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-[#141A2C] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{ord.orderId}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Tx: {ord.txHash.slice(0, 10)}...
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="text-slate-200 font-medium">{ord.traderLabel}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">
                            {ord.traderAddress.slice(0, 8)}...
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              ord.side === "BUY"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-white font-semibold tabular-nums">
                          ${ord.priceUsd.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 tabular-nums">
                          <div className="text-slate-200">{ord.quantityShares.toLocaleString()} shs</div>
                          {ord.filledShares > 0 && (
                            <div className="text-[10px] text-emerald-400">
                              Filled: {ord.filledShares.toLocaleString()}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 text-[10px] font-bold">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Architecture Highlights Callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0D111C] border border-[#1C2338] space-y-1">
                <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                  Sub-Second Block Engine
                </div>
                <div className="text-sm font-bold text-white">{selectedNetwork.blockTimeMs}ms Execution</div>
                <div className="text-[11px] text-slate-400">
                  Sub-second sequencers eliminate front-running and MEV sandwiching.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D111C] border border-[#1C2338] space-y-1">
                <div className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                  Zero Trust Pre-Trade Hook
                </div>
                <div className="text-sm font-bold text-white">SEC Rule 15c3-5 Collars</div>
                <div className="text-[11px] text-slate-400">
                  Intercepts fat-finger orders, wash self-matches, and position breaches.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D111C] border border-[#1C2338] space-y-1">
                <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  Gas Savings vs L1
                </div>
                <div className="text-sm font-bold text-white">42,850 Gas (~$0.0003)</div>
                <div className="text-[11px] text-slate-400">
                  99.8% cost reduction compared to vanilla mainnet EVM order books.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: KYC/AML CLEARINGHOUSE VIA INVESTOR IDENTITY NFTS */}
      {activeSubTab === "clearinghouse_sbt" && (
        <div className="space-y-6">
          {/* Enhanced ERC-5192 Investor Soulbound Token Gallery with Active Wallet Focus */}
          <InvestorSBTGallery
            activeWalletAddress={metaMaskAccount}
            onSelectSbt={(sbt) => {
              const idx = investorNfts.findIndex((n) => n.tokenId === sbt.tokenId);
              if (idx !== -1) setBuyerIndex(idx);
            }}
          />

          {/* Interactive Atomic DvP Clearinghouse Simulator */}
          <div className="bg-[#101420] border border-[#1C2338] rounded-2xl p-6 space-y-5">
            <div className="border-b border-[#1C2338] pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                Atomic DvP Settlement Engine (Cross-Border Compliance Rule Check)
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Simulate atomic Delivery-versus-Payment clearing between two institutional counterparties holding ERC-5192 Identity NFTs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buyer Selector */}
              <div className="p-4 rounded-xl bg-[#0B0E17] border border-[#1C2338] space-y-2">
                <label className="text-[11px] font-mono uppercase text-emerald-400 font-bold block">
                  Buyer Identity (USDC Consideration Payer)
                </label>

                <select
                  value={buyerIndex}
                  onChange={(e) => setBuyerIndex(Number(e.target.value))}
                  className="w-full bg-[#111626] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                >
                  {investorNfts.map((nft, idx) => (
                    <option key={nft.tokenId} value={idx}>
                      Buyer: {nft.entityName} ({nft.jurisdictionLabel})
                    </option>
                  ))}
                </select>

                <div className="text-[10px] font-mono text-slate-400 space-y-1 pt-1">
                  <div>Wallet: {activeBuyer.walletAddress}</div>
                  <div>Jurisdiction: <span className="text-white">{activeBuyer.jurisdictionLabel}</span></div>
                  <div>Tier: <span className="text-cyan-300">{activeBuyer.tierLabel}</span></div>
                </div>
              </div>

              {/* Seller Selector */}
              <div className="p-4 rounded-xl bg-[#0B0E17] border border-[#1C2338] space-y-2">
                <label className="text-[11px] font-mono uppercase text-rose-400 font-bold block">
                  Seller Identity (Security Token Deliverer)
                </label>

                <select
                  value={sellerIndex}
                  onChange={(e) => setSellerIndex(Number(e.target.value))}
                  className="w-full bg-[#111626] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                >
                  {investorNfts.map((nft, idx) => (
                    <option key={nft.tokenId} value={idx}>
                      Seller: {nft.entityName} ({nft.jurisdictionLabel})
                    </option>
                  ))}
                </select>

                <div className="text-[10px] font-mono text-slate-400 space-y-1 pt-1">
                  <div>Wallet: {activeSeller.walletAddress}</div>
                  <div>Jurisdiction: <span className="text-white">{activeSeller.jurisdictionLabel}</span></div>
                  <div>Tier: <span className="text-cyan-300">{activeSeller.tierLabel}</span></div>
                </div>
              </div>
            </div>

            {/* Settlement Shares & Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Asset To Clear
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-[#0B0E17] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white"
                >
                  <option value="TW-EQ">TW-EQ (NYSE Dual-Listing)</option>
                  <option value="TREE3">TREE3 (Sovereign Token)</option>
                  <option value="SPX-EQ">SPX-EQ (Pre-IPO Equity)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Shares Cleared
                </label>
                <input
                  type="number"
                  value={settlementShares}
                  onChange={(e) => setSettlementShares(e.target.value)}
                  className="w-full bg-[#0B0E17] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Price Per Share (USD)
                </label>
                <input
                  type="number"
                  value={settlementPrice}
                  onChange={(e) => setSettlementPrice(e.target.value)}
                  className="w-full bg-[#0B0E17] border border-[#232B44] rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0E17] border border-[#1C2338]">
              <div className="text-xs font-mono">
                <span className="text-slate-400">Gross Atomic Consideration: </span>
                <span className="text-white font-bold text-base">
                  ${((parseInt(settlementShares, 10) || 0) * (parseFloat(settlementPrice) || 0)).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} USDC
                </span>
              </div>

              <button
                type="button"
                onClick={handleExecuteAtomicSettlement}
                disabled={isSettling}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all active:scale-98"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{isSettling ? "Executing DvP Swap..." : "Execute Atomic DvP Settlement"}</span>
              </button>
            </div>
          </div>

          {/* Historical Settlements Table */}
          <div className="bg-[#101420] border border-[#1C2338] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Scale className="w-4 h-4 text-emerald-400" />
              Atomic Clearinghouse Receipts Vault ({settlements.length} Audited Receipts)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0A0D16] text-slate-400 border-b border-[#1C2338]">
                  <tr>
                    <th className="py-2.5 px-3">Settlement ID / Proof</th>
                    <th className="py-2.5 px-3">Buyer (USDC Payer)</th>
                    <th className="py-2.5 px-3">Seller (Asset Deliverer)</th>
                    <th className="py-2.5 px-3">Asset &amp; Volume</th>
                    <th className="py-2.5 px-3">Total Consideration</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182034]">
                  {settlements.map((st) => (
                    <tr key={st.settlementId} className="hover:bg-[#141A2C] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-white font-semibold">{st.settlementId.slice(0, 14)}...</div>
                        <div className="text-[10px] text-purple-400">Proof: {st.clearanceProofHash.slice(0, 12)}...</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{st.buyerLabel}</div>
                        <div className="text-[10px] text-slate-400">{st.buyerJurisdiction}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{st.sellerLabel}</div>
                        <div className="text-[10px] text-slate-400">{st.sellerJurisdiction}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-white font-semibold">{st.sharesCleared.toLocaleString()} {st.assetSymbol}</div>
                        <div className="text-[10px] text-slate-400">${st.pricePerShareUsd.toFixed(2)} / share</div>
                      </td>

                      <td className="py-2.5 px-3 text-emerald-400 font-semibold tabular-nums">
                        ${st.totalConsiderationUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[10px] font-bold">
                          {st.settlementStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SOLIDITY CONTRACTS & ARCHITECTURE SPEC */}
      {activeSubTab === "smart_contracts" && (
        <div className="space-y-6">
          <div className="bg-[#101420] border border-[#1C2338] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C2338] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-amber-400" />
                  Solidity Smart Contracts (Enterprise L2/L3 EVM &amp; ERC-5192)
                </h3>
                <p className="text-xs text-slate-400">
                  Ready-to-deploy Foundry/Hardhat contracts implementing Architecture Option 2 &amp; Tokenomics Option 3.
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    { key: "identity_sbt", label: "InvestorIdentityNFT.sol (ERC-5192)" },
                    { key: "compliance_hook", label: "PreTradeComplianceHook.sol" },
                    { key: "orderbook", label: "OnChainInstitutionalOrderBook.sol" },
                    { key: "clearinghouse", label: "MultiJurisdictionClearinghouse.sol" },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedContractKey(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                      selectedContractKey === c.key
                        ? "bg-amber-400 text-black font-bold shadow-sm"
                        : "bg-[#161C2C] text-slate-400 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Box */}
            <div className="rounded-xl bg-[#090C14] border border-[#182034] p-4 relative font-mono text-xs overflow-x-auto max-h-[500px]">
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={() => {
                    const textMap: Record<string, string> = {
                      identity_sbt: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n// InvestorIdentityNFT.sol - ERC-5192 Minimal Soulbound Token with ZK Attestations`,
                      compliance_hook: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n// PreTradeComplianceHook.sol - Pre-Execution SEC Rule 15c3-5 Hook`,
                      orderbook: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n// OnChainInstitutionalOrderBook.sol - Sub-second L2/L3 Rollup CLOB`,
                      clearinghouse: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n// MultiJurisdictionClearinghouse.sol - Atomic DvP Cross-Jurisdiction Clearing`,
                    };
                    handleCopyCode(selectedContractKey, textMap[selectedContractKey]);
                  }}
                  className="px-2.5 py-1 rounded bg-[#161D2E] hover:bg-[#20283E] text-slate-300 text-[11px] font-mono flex items-center gap-1 border border-[#242C44]"
                >
                  {copiedContractKey === selectedContractKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Solidity</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-slate-300 leading-relaxed">
                {selectedContractKey === "identity_sbt" && `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

contract InvestorIdentityNFT is IERC5192 {
    string public name = "Token World Investor Identity SBT";
    string public symbol = "TW-ID-SBT";
    
    struct InvestorAttestation {
        address investorWallet;
        uint16 jurisdictionCode;     // 840 = US 506c, 841 = QIB, 276 = EU MiFID, 702 = SG MAS
        uint8 accreditationTier;      // 1 = QIB, 2 = QP, 3 = Accredited, 4 = Professional
        uint64 issuedAt;
        uint64 expirationTimestamp;
        bytes32 zkIdentityCommitment;   // Hashed Poseidon KYC proof commitment
        bytes32 sanctionsScreeningHash; // Chainalysis / OFAC oracle hash
        bool isRevoked;
        string revocationReason;
    }

    mapping(uint256 => bool) private _isLocked;
    mapping(uint256 => InvestorAttestation) public attestations;
    mapping(address => uint256) public walletToTokenId;

    function locked(uint256 tokenId) external view override returns (bool) {
        return _isLocked[tokenId];
    }

    // ERC-721 transfers always revert (Permanent Soulbound Token)
    function transferFrom(address, address, uint256) external pure {
        revert("ErrSoulboundLocked");
    }
}`}

                {selectedContractKey === "compliance_hook" && `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPreTradeComplianceHook {
    function validateOrderPlacement(
        address trader,
        string calldata symbol,
        bool isBuy,
        uint256 priceUsdMicros,
        uint256 quantityShares,
        uint256 referencePriceMicros,
        uint256 currentTraderOpenShares
    ) external view returns (bool approved, string memory failureReason);
}

contract PreTradeComplianceHook is IPreTradeComplianceHook {
    InvestorIdentityNFT public immutable identityNFT;

    function validateOrderPlacement(...) external view override returns (bool, string memory) {
        // 1. Identity SBT Verification
        (bool isVerified, string memory idReason) = identityNFT.isVerifiedInvestor(trader, requiredJur, minTier);
        if (!isVerified) return (false, idReason);

        // 2. SEC Rule 15c3-5 Price Collar (+/- 10% deviation band)
        if (priceDeviation > maxCollarBps) return (false, "RULE_15C3_5_PRICE_COLLAR_BREACH");

        // 3. Single Ticket & Aggregate Position Limits
        if (quantityShares > maxSingleOrderShares) return (false, "ORDER_SIZE_EXCEEDS_MAX_LIMIT");

        return (true, "PRE_EXECUTION_COMPLIANCE_PASSED");
    }
}`}

                {selectedContractKey === "orderbook" && `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract OnChainInstitutionalOrderBook {
    IPreTradeComplianceHook public complianceHook;

    function placeOrder(
        string calldata symbol,
        OrderSide side,
        uint256 priceMicros,
        uint256 quantityShares,
        bytes32 clientOrderId
    ) external returns (uint256 orderId) {
        // Pre-Execution Hook Interception
        (bool approved, string memory reason) = complianceHook.validateOrderPlacement(
            msg.sender, symbol, side == OrderSide.BUY, priceMicros, quantityShares, ...
        );
        require(approved, reason);

        // Self-Trade / Wash-Trading Prevention
        _preventSelfMatch(msg.sender, symbol, side, priceMicros);

        // Sub-second Price-Time Priority Ladder Insertion
        orderId = _insertAndMatch(symbol, side, priceMicros, quantityShares);
    }
}`}

                {selectedContractKey === "clearinghouse" && `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MultiJurisdictionClearinghouse {
    InvestorIdentityNFT public immutable identityNFT;

    function clearAndSettleAtomicDvP(
        address buyer,
        address seller,
        string calldata assetSymbol,
        uint256 sharesToClear,
        uint256 pricePerShareMicros
    ) external returns (bytes32 settlementId) {
        // 1. Cross-reference Buyer & Seller Identity SBTs
        require(identityNFT.isVerifiedInvestor(buyer, ...), "BUYER_INELIGIBLE");
        require(identityNFT.isVerifiedInvestor(seller, ...), "SELLER_INELIGIBLE");

        // 2. Cross-Border Matrix Rule
        require(crossBorderPermitted[buyerJur][sellerJur], "CROSS_BORDER_PROHIBITED");

        // 3. Atomic DvP Execution & Cryptographic Settlement Proof
        bytes32 proofHash = keccak256(abi.encodePacked(buyer, seller, sharesToClear, ...));
        emit TradeClearedAndSettledDvP(settlementId, buyer, seller, assetSymbol, sharesToClear, proofHash);
    }
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE INVESTOR IDENTITY SBT MODAL */}
      {showMintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121626] border border-[#242C44] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#20273D] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Issue Investor Identity NFT (ERC-5192 SBT)
              </h3>
              <button
                type="button"
                onClick={() => setShowMintModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMintCustomNft} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Investor Entity Name</label>
                <input
                  type="text"
                  value={mintEntityName}
                  onChange={(e) => setMintEntityName(e.target.value)}
                  className="w-full bg-[#0A0D18] border border-[#232B44] rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. Goldman Sachs Digital Assets Desk"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Investor Public Address</label>
                <input
                  type="text"
                  value={mintWallet}
                  onChange={(e) => setMintWallet(e.target.value)}
                  className="w-full bg-[#0A0D18] border border-[#232B44] rounded-xl px-3 py-2 text-white"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Jurisdiction Standard</label>
                  <select
                    value={mintJurisdiction}
                    onChange={(e) => setMintJurisdiction(Number(e.target.value))}
                    className="w-full bg-[#0A0D18] border border-[#232B44] rounded-xl px-3 py-2 text-white"
                  >
                    <option value={840}>US SEC Reg D 506(c)</option>
                    <option value={841}>US Rule 144A (QIB)</option>
                    <option value={276}>EU MiFID II Professional</option>
                    <option value={702}>SG MAS SFA Accredited</option>
                    <option value={756}>CH FinSA Qualified Client</option>
                    <option value={826}>UK FCA High Net Worth</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Accreditation Tier</label>
                  <select
                    value={mintTier}
                    onChange={(e) => setMintTier(Number(e.target.value))}
                    className="w-full bg-[#0A0D18] border border-[#232B44] rounded-xl px-3 py-2 text-white"
                  >
                    <option value={1}>Tier 1: Institutional QIB ($100M+ AUM)</option>
                    <option value={2}>Tier 2: Qualified Purchaser ($5M+)</option>
                    <option value={3}>Tier 3: Accredited Investor ($1M+)</option>
                    <option value={4}>Tier 4: Professional Client</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0E18] border border-[#1C2338] text-[10px] text-slate-400 space-y-1">
                <div>• Token Standard: Non-transferable ERC-5192 Soulbound Token (SBT)</div>
                <div>• Sanctions Oracle: Verified via Chainalysis KYT &amp; OFAC SDN screening</div>
                <div>• Privacy: ZK identity commitment generated without raw PII exposure</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMintModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#161D2E] hover:bg-[#20283E] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Mint Identity SBT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
