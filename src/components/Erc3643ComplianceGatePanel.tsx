import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Building2,
  FileCheck,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Database,
  Search,
} from "lucide-react";
import {
  SAMPLE_RWA_ASSETS,
  SAMPLE_INVESTOR_PROFILES,
  InvestorIdentityProfile,
  AtsSecurityAsset,
  ComplianceGateVerificationResult,
} from "../utils/atsVenueData";
import { globalAtsEngine } from "../utils/atsMatchingEngine";

export const Erc3643ComplianceGatePanel: React.FC = () => {
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("SPX-EQ");
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("INV-01-SOVEREIGN");
  const [transferAmountShares, setTransferAmountShares] = useState<number>(50);
  const [evaluationResult, setEvaluationResult] = useState<ComplianceGateVerificationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const activeAsset = SAMPLE_RWA_ASSETS.find((a) => a.symbol === selectedAssetSymbol) || SAMPLE_RWA_ASSETS[0];
  const activeInvestor = SAMPLE_INVESTOR_PROFILES.find((p) => p.id === selectedInvestorId) || SAMPLE_INVESTOR_PROFILES[0];

  const handleRunComplianceCheck = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const res = globalAtsEngine.verifyInvestorCompliance(
        activeInvestor.walletAddress,
        activeAsset.symbol,
        transferAmountShares
      );
      setEvaluationResult(res);
      setIsEvaluating(false);
    }, 250);
  };

  const totalTransferValueUsd = transferAmountShares * activeAsset.referencePrice;

  return (
    <div className="bg-[#121622] border border-[#1E2436] rounded-2xl p-6 text-slate-100 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1E2436]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-wide">
              ERC-3643 & ERC-1400 On-Chain Compliance Gatekeeper
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              T-REX Automated KYC/AML
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate and audit real-time transfer restrictions across SEC Reg D 506(c), Reg S foreign exclusions, Rule 144A QIB checks, and Section 12(g) holder limits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunComplianceCheck}
          disabled={isEvaluating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-98 transition-all shrink-0"
        >
          {isEvaluating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-white" />
              <span>Evaluating Smart Contract Gates...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Simulate canTransfer() Gate</span>
            </>
          )}
        </button>
      </div>

      {/* Simulator Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Target RWA Asset */}
        <div className="p-4 rounded-xl bg-[#161B28] border border-[#242C3E] space-y-3 font-mono text-xs">
          <label className="text-slate-300 font-bold flex items-center justify-between">
            <span>1. Select Security Asset</span>
            <span className="text-[10px] text-amber-400">{activeAsset.categoryLabel}</span>
          </label>
          <select
            value={selectedAssetSymbol}
            onChange={(e) => {
              setSelectedAssetSymbol(e.target.value);
              setEvaluationResult(null);
            }}
            className="w-full bg-[#101420] border border-[#283248] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
          >
            {SAMPLE_RWA_ASSETS.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} - {asset.name} (${asset.referencePrice.toFixed(2)})
              </option>
            ))}
          </select>

          <div className="space-y-1 text-[11px] text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>SEC Exemption:</span>
              <span className="text-white font-bold">{activeAsset.secRegistration}</span>
            </div>
            <div className="flex justify-between">
              <span>Standard:</span>
              <span className="text-cyan-300">{activeAsset.standard}</span>
            </div>
            <div className="flex justify-between">
              <span>Min. Investment:</span>
              <span className="text-amber-300">${activeAsset.minimumInvestmentUsd.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Holding Lock:</span>
              <span className="text-slate-200">{activeAsset.holdingPeriodLockDays} Days</span>
            </div>
          </div>
        </div>

        {/* 2. Investor Identity Profile */}
        <div className="p-4 rounded-xl bg-[#161B28] border border-[#242C3E] space-y-3 font-mono text-xs">
          <label className="text-slate-300 font-bold flex items-center justify-between">
            <span>2. Select Investor Identity</span>
            <span className="text-[10px] text-emerald-400">ONCHAINID Verified</span>
          </label>
          <select
            value={selectedInvestorId}
            onChange={(e) => {
              setSelectedInvestorId(e.target.value);
              setEvaluationResult(null);
            }}
            className="w-full bg-[#101420] border border-[#283248] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
          >
            {SAMPLE_INVESTOR_PROFILES.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.investorName} [{inv.accreditationTier}]
              </option>
            ))}
          </select>

          <div className="space-y-1 text-[11px] text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>Country of Residency:</span>
              <span className="text-white font-bold">{activeInvestor.countryCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Accreditation Tier:</span>
              <span className={`font-bold ${activeInvestor.accreditationTier === "RETAIL_RESTRICTED" ? "text-red-400" : "text-emerald-400"}`}>
                {activeInvestor.accreditationTier}
              </span>
            </div>
            <div className="flex justify-between">
              <span>KYC Status:</span>
              <span className={`font-bold ${activeInvestor.kycStatus === "VERIFIED" ? "text-emerald-400" : "text-amber-400"}`}>
                {activeInvestor.kycStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wallet Address:</span>
              <span className="text-slate-300 truncate max-w-[140px]">{activeInvestor.walletAddress}</span>
            </div>
          </div>
        </div>

        {/* 3. Transfer Order Parameters */}
        <div className="p-4 rounded-xl bg-[#161B28] border border-[#242C3E] space-y-3 font-mono text-xs">
          <label className="text-slate-300 font-bold flex items-center justify-between">
            <span>3. Order Volume & Size</span>
            <span className="text-[10px] text-cyan-400">Pre-Trade Validation</span>
          </label>

          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400">Shares / Units to Trade:</span>
            <input
              type="number"
              min="1"
              value={transferAmountShares}
              onChange={(e) => {
                setTransferAmountShares(Math.max(1, parseInt(e.target.value) || 1));
                setEvaluationResult(null);
              }}
              className="w-full bg-[#101420] border border-[#283248] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
            />
          </div>

          <div className="space-y-1 text-[11px] text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>Gross Notional USD:</span>
              <span className="text-white font-bold">${totalTransferValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Clearing Method:</span>
              <span className="text-emerald-300">Atomic DvP T+0</span>
            </div>
            <div className="flex justify-between">
              <span>Rule 15c3-5 Margin Check:</span>
              <span className="text-emerald-400 font-bold">100% COLLAR PASS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Compliance Gate Output */}
      {evaluationResult ? (
        <div
          className={`p-5 rounded-2xl border-2 space-y-3 font-mono animate-in zoom-in-95 ${
            evaluationResult.canTransfer
              ? "bg-emerald-950/20 border-emerald-500/50"
              : "bg-red-950/20 border-red-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {evaluationResult.canTransfer ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-400" />
              )}
              <span className="font-bold text-sm text-white">
                {evaluationResult.canTransfer ? "ON-CHAIN COMPLIANCE CLEARANCE: APPROVED" : "ON-CHAIN COMPLIANCE CLEARANCE: REJECTED"}
              </span>
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                evaluationResult.canTransfer
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/20 text-red-300 border border-red-500/40"
              }`}
            >
              {evaluationResult.reasonCode}
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            {evaluationResult.message}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-[#222A3E] text-slate-400">
            <div>Gate Rule: <span className="text-cyan-300 font-semibold">{evaluationResult.ruleEvaluated}</span></div>
            <div>Gate Address: <span className="text-slate-300 truncate font-semibold">{evaluationResult.onChainGateAddress.slice(0, 10)}...</span></div>
            <div>Estimated Gas: <span className="text-amber-300 font-semibold">{evaluationResult.gasUnitsEstimated.toLocaleString()} units</span></div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#141826] border border-[#222A3E] text-xs font-mono text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Click &apos;Simulate canTransfer() Gate&apos; above to execute live on-chain compliance validation.</span>
          </span>
          <span className="text-slate-500">T-REX ERC-3643 Engine Ready</span>
        </div>
      )}

      {/* Active Identity Registry Verification Claims */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2436]">
          <span className="font-bold text-white flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span>Cryptographic Identity Claims for {activeInvestor.investorName}</span>
          </span>
          <span className="text-[10px] text-slate-400">ONCHAINID: {activeInvestor.onChainId}</span>
        </div>

        {activeInvestor.verifiedClaims.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {activeInvestor.verifiedClaims.map((claim, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-[#161B28] border border-[#222A3E] space-y-1">
                <div className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{claim.claimType}</span>
                </div>
                <div className="text-[10px] text-slate-400">Issuer: {claim.issuer}</div>
                <div className="text-[10px] text-slate-500">Valid Until: {new Date(claim.validUntil).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>No verified on-chain claims detected. Unverified retail investors cannot trade SEC-regulated security tokens.</span>
          </div>
        )}
      </div>
    </div>
  );
};
