import React, { useState, useMemo } from "react";
import {
  Landmark,
  TrendingUp,
  ShieldCheck,
  Layers,
  Clock,
  Zap,
  Lock,
  ShieldAlert,
  Crown,
  CheckCircle2,
  Download,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  DollarSign,
  Cpu,
  BarChart3,
  Flame,
  Activity,
  Plus,
  Check,
  Coins,
  Scale,
  Code2,
} from "lucide-react";
import {
  OWNER_PROFILE,
  TWE_PLATFORM_SPECIFICATIONS,
  TWE_FEE_TIERS,
  TWE_GOVERNANCE_PROPOSALS,
  TweGovernanceProposal,
  downloadDocumentFile,
} from "../utils/atsVenueData";
import { TokenRecord } from "../types";

export interface NyseTweTickerExchangeHubProps {
  onTradeSymbol?: (symbol: string) => void;
  onMintToVault?: (token: Partial<TokenRecord>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const NyseTweTickerExchangeHub: React.FC<NyseTweTickerExchangeHubProps> = ({
  onTradeSymbol,
  onMintToVault,
  onNavigateToTab,
}) => {
  // Active operational feature tab
  const [activeFeatureTab, setActiveFeatureTab] = useState<
    "continuous_trading" | "instant_settlement" | "unified_market_data" | "compliance_standards"
  >("continuous_trading");

  // TWE Utility tab
  const [activeUtilityTab, setActiveUtilityTab] = useState<
    "fee_discounts" | "governance" | "staking_incentives"
  >("fee_discounts");

  // Interactive Fee Calculator State
  const [monthlyVolumeUsd, setMonthlyVolumeUsd] = useState<number>(2500000);
  const [tweHoldingTokens, setTweHoldingTokens] = useState<number>(55000);

  // Staking Simulator State
  const [stakedTweAmount, setStakedTweAmount] = useState<number>(100000);
  const [isStakingLoading, setIsStakingLoading] = useState<boolean>(false);
  const [stakedNotice, setStakedNotice] = useState<string | null>(null);

  // Governance Proposals State
  const [proposals, setProposals] = useState<TweGovernanceProposal[]>(TWE_GOVERNANCE_PROPOSALS);
  const [votedProposals, setVotedProposals] = useState<Record<string, "FOR" | "AGAINST">>({});

  // Quick Order Simulation State
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderQty, setOrderQty] = useState<number>(500);
  const [orderPrice, setOrderPrice] = useState<number>(100.0);
  const [simulatedTradesCount, setSimulatedTradesCount] = useState<number>(1420);
  const [orderSuccessNotice, setOrderSuccessNotice] = useState<string | null>(null);

  // Contract Copy Notice
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Calculate user fee tier based on holding
  const currentFeeTier = useMemo(() => {
    if (tweHoldingTokens >= 250000) return TWE_FEE_TIERS[3];
    if (tweHoldingTokens >= 50000) return TWE_FEE_TIERS[2];
    if (tweHoldingTokens >= 10000) return TWE_FEE_TIERS[1];
    return TWE_FEE_TIERS[0];
  }, [tweHoldingTokens]);

  // Fee calculation numbers
  const standardMonthlyFee = (monthlyVolumeUsd * 0.25) / 100;
  const discountedMonthlyFee = (monthlyVolumeUsd * currentFeeTier.takerFeePercent) / 100;
  const monthlySavings = standardMonthlyFee - discountedMonthlyFee;
  const annualSavings = monthlySavings * 12;

  // Handle Governance Vote
  const handleVote = (proposalId: string, side: "FOR" | "AGAINST") => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === proposalId) {
          return {
            ...p,
            votesFor: side === "FOR" ? p.votesFor + 50000 : p.votesFor,
            votesAgainst: side === "AGAINST" ? p.votesAgainst + 50000 : p.votesAgainst,
          };
        }
        return p;
      })
    );
    setVotedProposals((prev) => ({ ...prev, [proposalId]: side }));
  };

  // Handle Simulated Order Placement
  const handlePlaceSimulatedOrder = () => {
    setSimulatedTradesCount((prev) => prev + 1);
    setOrderSuccessNotice(
      `Order Matched: ${orderSide} ${orderQty} TWE @ $${orderPrice.toFixed(
        2
      )} via C++ Sub-Millisecond Engine (T+0 Atomic DvP Settled)!`
    );
    setTimeout(() => setOrderSuccessNotice(null), 5000);
  };

  // Handle Staking
  const handleStakeTwe = () => {
    setIsStakingLoading(true);
    setTimeout(() => {
      setIsStakingLoading(false);
      setStakedNotice(
        `Successfully staked ${stakedTweAmount.toLocaleString()} TWE! Colocated 140µs Direct FIX Routing activated at 8.5% APY yield.`
      );
      setTimeout(() => setStakedNotice(null), 6000);
    }, 800);
  };

  // Solidity Smart Contract for TWE
  const tweContractSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title TokenWorldExchangeATS (Ticker: TWE)
 * @notice SEC Regulation ATS Institutional Security & Governance Token
 * @dev Fully compliant with SEC Rule 15c3-5 Pre-Trade Risk Filters & T+0 Atomic Settlement
 * Venue: Token World Exchange ATS® (Sole Owner: Mauro Lomibao Dar III)
 */
contract TokenWorldExchangeATS is ERC20Permit, Ownable {
    string public constant MARKET_VENUE = "Token World Exchange ATS(R)";
    string public constant SOLE_OWNER = "Mauro Lomibao Dar III";
    string public constant OWNER_EMAIL = "maurodar08@gmail.com";
    string public constant SEC_REGISTRATION = "SEC Form ATS-N / FINRA CRD# 8492041";
    string public constant DTCC_FAST_ID = "DTCC FAST Participant #9450";

    uint256 public constant TOTAL_MAX_SUPPLY = 100_000_000 * 10**18; // 100M TWE Cap
    
    // Whitelist for SEC Rule 144A / Accredited Investors
    mapping(address => bool) public isWhitelistedInvestor;
    mapping(address => uint256) public stakedBalance;
    
    event InvestorWhitelisted(address indexed investor, bool status);
    event AtomicSettlementExecuted(address indexed from, address indexed to, uint256 amount, bytes32 indexed tradeId);
    event TokensStaked(address indexed user, uint256 amount, uint256 newBalance);

    constructor(address initialTreasury) 
        ERC20("Token World Exchange ATS", "TWE") 
        ERC20Permit("Token World Exchange ATS")
        Ownable(initialTreasury)
    {
        _mint(initialTreasury, TOTAL_MAX_SUPPLY);
        isWhitelistedInvestor[initialTreasury] = true;
    }

    function whitelistInvestor(address investor, bool status) external onlyOwner {
        isWhitelistedInvestor[investor] = status;
        emit InvestorWhitelisted(investor, status);
    }

    function executeAtomicSettlement(
        address from,
        address to,
        uint256 amount,
        bytes32 tradeId
    ) external onlyOwner returns (bool) {
        require(isWhitelistedInvestor[from] && isWhitelistedInvestor[to], "Compliance: Non-whitelisted participant");
        _transfer(from, to, amount);
        emit AtomicSettlementExecuted(from, to, amount, tradeId);
        return true;
    }

    function stake(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient TWE balance");
        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        emit TokensStaked(msg.sender, amount, stakedBalance[msg.sender]);
    }
}`;

  // Download Prospectus
  const handleDownloadProspectus = () => {
    const markdown = `# TOKEN WORLD EXCHANGE ATS® (TICKER: TWE)
## Official Institutional Platform Specifications & Prospectus
---
**Market Venue:** Token World Exchange ATS®
**Exchange Ticker Symbol:** TWE
**Regulatory Status:** SEC Regulation ATS & FINRA Registered Broker-Dealer
**FINRA CRD Number:** CRD# 8492041
**SEC ATS File Number:** SEC File No. 024-11894
**DTCC FAST Depository ID:** DTCC FAST Participant #9450
**Sole Owner and Creator:** Mauro Lomibao Dar III (maurodar08@gmail.com)
**Headquarters:** 945 Westholme Avenue, Los Angeles, California 90024

### 1. Executive Summary & Overview
Token World Exchange ATS® (TWE) is an institutional-grade Alternative Trading System (ATS) operating under SEC/FINRA oversight to facilitate continuous trading, liquidity, and settlement for tokenized securities, ETFs, and real-world assets (RWAs). Integrated with major financial exchange networks and data distributors, TWE bridges traditional equity capital markets with blockchain technology.

### 2. Institutional Platform Specifications
- Market Venue: Token World Exchange ATS®
- Exchange Ticker Symbol: TWE
- Regulatory Status: SEC Regulation ATS & FINRA Registered Broker-Dealer
- Asset Class Support: Tokenized Equities, ETFs, Institutional RWAs
- Trading Schedule: 24/7/365 Continuous Execution
- Settlement Mechanism: T+0 Atomic On-Chain Settlement
- Transfer Agent / Custody: SEC-Regulated Digital Transfer Agents & Qualified Custodians

### 3. Key Operational Features
- 24/7 Continuous Trading: Global institutional access with round-the-clock price discovery.
- Instant Settlement: T+0 settlement via smart contracts reduces counterparty risk and collateral drag.
- Unified Market Data: Interoperable real-time market feeds connecting traditional stock exchanges with web3 data networks.
- Compliance Standards: Built-in automated KYC/AML checks, identity verification, and permissioned investor whitelisting.

### 4. TWE Utility & Ecosystem Token Model
- Ticker: TWE
- Fee Tier Discounts: Traders holding TWE receive dynamic maker/taker fee rebates on ATS trade executions.
- Governance & Protocol Upgrades: Token holders participate in platform governance proposals, including fee schedules and asset onboarding.
- Liquidity & Staking Incentives: Market makers stake TWE to unlock institutional API routing and earn validator/liquidity provider rewards.
`;
    downloadDocumentFile("Token_World_Exchange_ATS_Ticker_TWE_Prospectus.md", markdown, "text/markdown");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {orderSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#101018] to-[#12121A] border border-emerald-500/50 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{orderSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setOrderSuccessNotice(null)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {stakedNotice && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-[#101018] to-[#12121A] border border-amber-500/50 flex items-center justify-between gap-3 text-xs text-amber-200 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">{stakedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStakedNotice(null)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Flagship Hero Header: NYSE Token World Exchange ATS® (Ticker: TWE) */}
      <div className="rounded-2xl bg-gradient-to-br from-[#181826] via-[#12121A] to-[#0A0A0F] border-2 border-amber-500/60 p-5 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#1C1C28] via-[#101016] to-[#0A0A0E] border-2 border-amber-500/60 p-1 shadow-[0_0_25px_rgba(242,125,38,0.35)] flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
                alt="Token World Exchange ATS® Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
                }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-xs font-black font-mono uppercase tracking-wider">
                  NYSE &bull; SEC REG ATS
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                  TICKER: TWE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  24/7/365 CONTINUOUS LIVE EXECUTION
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Token World Exchange ATS® <span className="text-amber-400">(Ticker: TWE)</span>
              </h1>

              <p className="text-xs sm:text-sm text-gray-300 font-sans max-w-3xl leading-relaxed">
                Institutional-grade Alternative Trading System (ATS) operating under SEC/FINRA oversight to facilitate continuous trading, liquidity, and settlement for tokenized securities, ETFs, and real-world assets (RWAs).
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-gray-400 pt-1">
                <span>Sole Owner &amp; Creator:</span>
                <strong className="text-white font-medium">Mauro Lomibao Dar III®</strong>
                <span>&bull;</span>
                <span className="text-amber-300">maurodar08@gmail.com</span>
                <span>&bull;</span>
                <span className="text-gray-400">945 Westholme Ave, Los Angeles, CA 90024</span>
              </div>
            </div>
          </div>

          {/* Live Quote & Action Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto shrink-0">
            <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#26263A] w-full sm:w-auto lg:w-64 space-y-1 text-right">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                TWE Reference Price
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-center justify-end gap-2">
                <span>$100.00</span>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  +4.25%
                </span>
              </div>
              <div className="text-[10px] font-mono text-gray-400 flex justify-between">
                <span>Market Cap:</span>
                <span className="text-amber-400 font-bold">$10.0 Billion</span>
              </div>
              <div className="text-[10px] font-mono text-gray-400 flex justify-between">
                <span>24h Traded Volume:</span>
                <span className="text-cyan-400 font-bold">$185.0 Million</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleDownloadProspectus}
                className="px-3 py-2 rounded-xl bg-[#161622] hover:bg-[#202030] text-gray-200 hover:text-white border border-[#2E2E42] text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Prospectus (.md)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onMintToVault) {
                    onMintToVault({
                      id: "twe-flagship-nyse",
                      name: "Token World Exchange ATS®",
                      symbol: "TWE",
                      decimals: 18,
                      totalSupply: 100000000,
                      priceUsd: 100.0,
                      marketCap: 10000000000,
                      volume24h: 185000000,
                      change24h: 4.25,
                      chain: "ethereum",
                      contractAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
                      verified: true,
                      score: 100,
                    });
                  }
                  if (onTradeSymbol) onTradeSymbol("TWE");
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Trade TWE on CLOB</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1 & 2: EXECUTIVE SUMMARY & INSTITUTIONAL PLATFORM SPECIFICATIONS
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: Executive Summary & Overview (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#101016] border border-[#222232] p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                1. Executive Summary &amp; Overview
              </h2>
            </div>

            <p className="text-xs text-gray-200 leading-relaxed font-sans">
              <strong>Token World Exchange ATS® (TWE)</strong> is an institutional-grade Alternative Trading System (ATS) operating under SEC/FINRA oversight to facilitate continuous trading, liquidity, and settlement for tokenized securities, ETFs, and real-world assets (RWAs). Integrated with major financial exchange networks and data distributors, TWE bridges traditional equity capital markets with blockchain technology.
            </p>

            <div className="space-y-2 pt-2 border-t border-[#1C1C28]">
              <div className="p-3 rounded-xl bg-[#0A0A0E] border border-[#1E1E2A] space-y-1">
                <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block">
                  Traditional Market Bridges
                </span>
                <p className="text-[11px] text-gray-300">
                  Dual-listed interoperability with New York Stock Exchange (NYSE Rule 497) and electronic book-entry reconciliation via DTCC FAST Participant #9450.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0A0A0E] border border-[#1E1E2A] space-y-1">
                <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold block">
                  Deterministic Order Matching
                </span>
                <p className="text-[11px] text-gray-300">
                  Sub-millisecond matching engine executing 100,000+ orders per second with strict price-time priority and microsecond deterministic settlement.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0A0A0E] border border-[#1E1E2A] space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">
                  Instant Atomic Settlement
                </span>
                <p className="text-[11px] text-gray-300">
                  T+0 on-chain Delivery-versus-Payment (DvP) via ERC-3643 permissioned contracts, eliminating 2-day counterparty credit exposure.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E1E2C] flex items-center justify-between text-[11px] font-mono text-gray-400">
            <span>SEC Form ATS-N Verified</span>
            <span className="text-emerald-400 font-bold">FINRA Broker-Dealer Cleared</span>
          </div>
        </div>

        {/* Section 2: Institutional Platform Specifications (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#101016] border border-[#222232] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                2. Institutional Platform Specifications
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              NYSE &bull; SEC REG ATS
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#20202E]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#161622] text-gray-400 uppercase text-[10px] border-b border-[#20202E]">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Parameter</th>
                  <th className="py-2.5 px-4 font-bold">Specification</th>
                  <th className="py-2.5 px-4 font-bold text-right">Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A26]">
                {TWE_PLATFORM_SPECIFICATIONS.map((spec, idx) => (
                  <tr key={idx} className="hover:bg-[#14141E] transition-colors">
                    <td className="py-2.5 px-4 font-bold text-gray-300 whitespace-nowrap">
                      {spec.parameter}
                    </td>
                    <td className="py-2.5 px-4 text-white font-semibold">
                      {spec.specification}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                        {spec.badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono text-[10px]">
            <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
              <div className="text-emerald-400 font-bold text-xs">T+0 Atomic</div>
              <div className="text-gray-400 uppercase mt-0.5">Settlement Rail</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
              <div className="text-cyan-400 font-bold text-xs">24/7/365</div>
              <div className="text-gray-400 uppercase mt-0.5">Trading Hours</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
              <div className="text-amber-400 font-bold text-xs">Rule 15c3-5</div>
              <div className="text-gray-400 uppercase mt-0.5">Pre-Trade Collars</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
              <div className="text-purple-400 font-bold text-xs">FAST #9450</div>
              <div className="text-gray-400 uppercase mt-0.5">DTCC Participant</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: KEY OPERATIONAL FEATURES (INTERACTIVE TABS)
         ========================================================================= */}
      <div className="rounded-2xl bg-[#101016] border border-[#222232] p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1E1E2C] pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              3. Key Operational Features &amp; Execution Architecture
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live operational mechanisms powering 24/7 price discovery, T+0 settlement, unified feeds, and automated compliance.
            </p>
          </div>

          {/* Subtabs for Section 3 */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0A0A0E] p-1 rounded-xl border border-[#20202E]">
            {[
              { id: "continuous_trading", label: "24/7 Trading", icon: Clock },
              { id: "instant_settlement", label: "Instant T+0", icon: Zap },
              { id: "unified_market_data", label: "Unified Market Data", icon: Activity },
              { id: "compliance_standards", label: "Compliance Standards", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCur = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFeatureTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    isCur
                      ? "bg-amber-500 text-black font-bold shadow-md"
                      : "text-gray-400 hover:text-white hover:bg-[#181824]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature 1: 24/7 Continuous Trading & Live Order Book */}
        {activeFeatureTab === "continuous_trading" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    24/7 Continuous Trading &amp; Global Access
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Round-the-Clock Price Discovery
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  Unlike legacy exchanges constrained by 9:30 AM – 4:00 PM ET operating windows, Token World Exchange ATS® executes 24 hours a day, 365 days a year. Institutional traders in New York, London, Tokyo, and Singapore participate seamlessly in a unified liquidity pool.
                </p>

                {/* Simulated Order Entry */}
                <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-3">
                  <span className="text-xs font-bold text-white uppercase font-mono block">
                    Simulate TWE Institutional Order Execution
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Side</label>
                      <div className="flex rounded-lg overflow-hidden border border-[#2A2A3E]">
                        <button
                          type="button"
                          onClick={() => setOrderSide("BUY")}
                          className={`flex-1 py-1.5 text-center font-bold cursor-pointer ${
                            orderSide === "BUY" ? "bg-emerald-500 text-black" : "bg-[#14141E] text-gray-400"
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderSide("SELL")}
                          className={`flex-1 py-1.5 text-center font-bold cursor-pointer ${
                            orderSide === "SELL" ? "bg-rose-500 text-white" : "bg-[#14141E] text-gray-400"
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Quantity (TWE)</label>
                      <input
                        type="number"
                        value={orderQty}
                        onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                        className="w-full py-1.5 px-2 rounded-lg bg-[#14141E] border border-[#2A2A3E] text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Price ($USD)</label>
                      <input
                        type="number"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(Number(e.target.value))}
                        step="0.25"
                        className="w-full py-1.5 px-2 rounded-lg bg-[#14141E] border border-[#2A2A3E] text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-gray-400">
                      Total Notional:{" "}
                      <strong className="text-white">${(orderQty * orderPrice).toLocaleString()} USD</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handlePlaceSimulatedOrder}
                      className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition ${
                        orderSide === "BUY"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                          : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                      }`}
                    >
                      Route {orderSide} Order
                    </button>
                  </div>
                </div>
              </div>

              {/* Live TWE Depth Book Table */}
              <div className="lg:col-span-6 rounded-xl bg-[#0D0D14] border border-[#222234] p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    TWE Central Limit Order Book Depth (L2)
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Latency: <strong className="text-emerald-400">140 µs</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Bids */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase border-b border-[#1E1E2C] pb-1 flex justify-between">
                      <span>Bids (Qty)</span>
                      <span>Price</span>
                    </div>
                    {[
                      { price: 99.95, qty: 15400, fill: "85%" },
                      { price: 99.90, qty: 28500, fill: "95%" },
                      { price: 99.85, qty: 12000, fill: "60%" },
                      { price: 99.80, qty: 45000, fill: "100%" },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className="flex justify-between py-1 px-1.5 rounded bg-emerald-500/10 text-[11px]"
                      >
                        <span className="text-gray-300">{b.qty.toLocaleString()}</span>
                        <span className="font-bold text-emerald-400">${b.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Asks */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-rose-400 font-bold uppercase border-b border-[#1E1E2C] pb-1 flex justify-between">
                      <span>Price</span>
                      <span>Asks (Qty)</span>
                    </div>
                    {[
                      { price: 100.05, qty: 14200, fill: "75%" },
                      { price: 100.10, qty: 26000, fill: "90%" },
                      { price: 100.15, qty: 18500, fill: "80%" },
                      { price: 100.20, qty: 38000, fill: "100%" },
                    ].map((a, i) => (
                      <div
                        key={i}
                        className="flex justify-between py-1 px-1.5 rounded bg-rose-500/10 text-[11px]"
                      >
                        <span className="font-bold text-rose-400">${a.price.toFixed(2)}</span>
                        <span className="text-gray-300">{a.qty.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E1E2C] flex items-center justify-between text-[10px] text-gray-400">
                  <span>Spread: $0.10 (0.10%)</span>
                  <span>Total Venue Executions: {simulatedTradesCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature 2: Instant Settlement (T+0) */}
        {activeFeatureTab === "instant_settlement" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-2">
                <div className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Zero Collateral Drag
                </div>
                <p className="text-gray-300 font-sans text-xs leading-relaxed">
                  Traditional equity trades under legacy rules require up to 2 full business days (T+1 or T+2) to clear through DTCC, immobilizing billions in margin capital.
                </p>
                <div className="pt-2 text-emerald-400 font-bold">
                  TWE ATS Result: 100% Instant Delivery-vs-Payment (DvP)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-2">
                <div className="text-cyan-400 font-bold text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Counterparty Risk Extinguished
                </div>
                <p className="text-gray-300 font-sans text-xs leading-relaxed">
                  Settlement is executed atomically inside audited smart contracts. Tokens and digital USD (USDC/Treasury settlement rails) exchange custody within the exact same block execution.
                </p>
                <div className="pt-2 text-cyan-400 font-bold">
                  Zero Settlement Fails Recorded
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-2">
                <div className="text-purple-400 font-bold text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  DTCC FAST Reconciliation
                </div>
                <p className="text-gray-300 font-sans text-xs leading-relaxed">
                  Continuous dual-venue reconciliation automatically adjusts the master shareholder ledger between the NYSE public depository float and Token World on-chain tokens.
                </p>
                <div className="pt-2 text-purple-400 font-bold">
                  Participant #9450 Live Sync
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature 3: Unified Market Data */}
        {activeFeatureTab === "unified_market_data" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-5 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Interoperable Real-Time Market Data Feeds
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Connecting traditional financial networks (NYSE/Nasdaq SIP, FIX Protocol 4.4/5.0) with Web3 on-chain oracle and sub-graph data networks.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                  FIX &bull; REST &bull; WebSockets
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-3 rounded-lg bg-[#14141E] border border-[#26263A] space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase">Direct FIX 4.4 Feed</span>
                  <span className="text-emerald-400 font-bold block">140µs Multicast ITCH</span>
                  <span className="text-[10px] text-gray-400">Institutional Co-location</span>
                </div>

                <div className="p-3 rounded-lg bg-[#14141E] border border-[#26263A] space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase">NYSE Listing Bridge</span>
                  <span className="text-cyan-400 font-bold block">Rule 497 Consolidated SIP</span>
                  <span className="text-[10px] text-gray-400">Dual-Venue Synchronization</span>
                </div>

                <div className="p-3 rounded-lg bg-[#14141E] border border-[#26263A] space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase">Chainlink &amp; Pyth Feeds</span>
                  <span className="text-amber-400 font-bold block">On-Chain NAV Publishing</span>
                  <span className="text-[10px] text-gray-400">Sub-Second Heartbeat</span>
                </div>

                <div className="p-3 rounded-lg bg-[#14141E] border border-[#26263A] space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase">SEC Audit Tape</span>
                  <span className="text-purple-400 font-bold block">Rule 301 CAT / OATS</span>
                  <span className="text-[10px] text-gray-400">FINRA Order Audit Trail</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature 4: Compliance Standards */}
        {activeFeatureTab === "compliance_standards" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-2.5">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Automated KYC / AML &amp; Investor Identity Verification
                </h4>
                <p className="text-gray-300 font-sans leading-relaxed text-xs">
                  Every participant wallet trading TWE on Token World Exchange ATS® must be verified by SEC-regulated identity providers under ERC-3643 (ONCHAINID) standards. Sanction lists (OFAC) and beneficial ownership audits are evaluated continuously.
                </p>
                <div className="p-2.5 rounded-lg bg-[#14141E] border border-emerald-500/30 text-[11px] text-emerald-300">
                  ✓ QIB (Rule 144A) &bull; Accredited (Reg D 506(c)) &bull; Offshore (Reg S) Verified
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-2.5">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  SEC Rule 15c3-5 Market Access Risk Controls
                </h4>
                <p className="text-gray-300 font-sans leading-relaxed text-xs">
                  Sub-millisecond financial risk collars prevent erroneous orders, flash dislocations, or unauthorized participant leverage before orders hit the central limit order book.
                </p>
                <div className="p-2.5 rounded-lg bg-[#14141E] border border-amber-500/30 text-[11px] text-amber-300">
                  ✓ Max Notional $10M Cap &bull; ±5% MA Dynamic Price Band &bull; Auto-Halt Active
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 4: TWE UTILITY & ECOSYSTEM TOKEN MODEL
         ========================================================================= */}
      <div className="rounded-2xl bg-[#101016] border border-[#222232] p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1E1E2C] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                4. TWE Utility &amp; Ecosystem Token Model
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Ticker: <strong>TWE</strong> &bull; Dynamic Fee Rebates, Protocol Governance, and Institutional Staking Incentives.
            </p>
          </div>

          {/* Subtabs for Section 4 */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0A0A0E] p-1 rounded-xl border border-[#20202E]">
            {[
              { id: "fee_discounts", label: "Fee Tier Discounts", icon: DollarSign },
              { id: "governance", label: "Governance Proposals", icon: Scale },
              { id: "staking_incentives", label: "Staking & Liquidity", icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCur = activeUtilityTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveUtilityTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    isCur
                      ? "bg-amber-500 text-black font-bold shadow-md"
                      : "text-gray-400 hover:text-white hover:bg-[#181824]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4A: Fee Tier Discounts & Dynamic Calculator */}
        {activeUtilityTab === "fee_discounts" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Fee Tiers Table (7 cols) */}
              <div className="lg:col-span-7 space-y-3 font-mono text-xs">
                <span className="text-xs font-bold text-white uppercase block">
                  Institutional Fee Schedule by TWE Token Holdings
                </span>
                <div className="overflow-x-auto rounded-xl border border-[#20202E]">
                  <table className="w-full text-left">
                    <thead className="bg-[#161622] text-gray-400 uppercase text-[10px] border-b border-[#20202E]">
                      <tr>
                        <th className="py-2.5 px-3">Tier</th>
                        <th className="py-2.5 px-3">Required TWE</th>
                        <th className="py-2.5 px-3">Maker Fee</th>
                        <th className="py-2.5 px-3">Taker Fee</th>
                        <th className="py-2.5 px-3 text-right">Routing Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A26]">
                      {TWE_FEE_TIERS.map((tier, i) => {
                        const isUserTier = currentFeeTier.tier === tier.tier;
                        return (
                          <tr
                            key={i}
                            className={`transition-colors ${
                              isUserTier ? "bg-amber-500/15 font-bold" : "hover:bg-[#14141E]"
                            }`}
                          >
                            <td className="py-2.5 px-3 text-white flex items-center gap-1.5">
                              {isUserTier && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                              <span>{tier.tier}</span>
                            </td>
                            <td className="py-2.5 px-3 text-amber-300">
                              {tier.holdingRequired.toLocaleString()} TWE
                            </td>
                            <td className="py-2.5 px-3 text-emerald-400">
                              {tier.makerFeePercent === 0 ? "0.00% (FREE)" : `${tier.makerFeePercent}%`}
                            </td>
                            <td className="py-2.5 px-3 text-cyan-400">{tier.takerFeePercent}%</td>
                            <td className="py-2.5 px-3 text-right text-gray-300 text-[11px]">
                              {tier.apiRoutingPriority}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Fee Calculator (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Interactive TWE Fee Rebate Calculator
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    Active: {currentFeeTier.tier.split(":")[0]}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      Your TWE Token Holding: <strong>{tweHoldingTokens.toLocaleString()} TWE</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="300000"
                      step="5000"
                      value={tweHoldingTokens}
                      onChange={(e) => setTweHoldingTokens(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      Monthly Trading Volume ($USD): <strong>${monthlyVolumeUsd.toLocaleString()}</strong>
                    </label>
                    <input
                      type="range"
                      min="100000"
                      max="20000000"
                      step="100000"
                      value={monthlyVolumeUsd}
                      onChange={(e) => setMonthlyVolumeUsd(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-[#14141E] border border-[#26263A] space-y-1.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Standard Rate (0.25%):</span>
                      <span className="text-gray-300">${standardMonthlyFee.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between text-cyan-300 font-bold">
                      <span>Your TWE Rate ({currentFeeTier.takerFeePercent}%):</span>
                      <span>${discountedMonthlyFee.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold border-t border-[#262638] pt-1.5 text-sm">
                      <span>Monthly Net Savings:</span>
                      <span>+${monthlySavings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-bold text-xs">
                      <span>Annual Projected Savings:</span>
                      <span>+${annualSavings.toLocaleString()} / yr</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4B: Governance & Protocol Upgrades */}
        {activeUtilityTab === "governance" && (
          <div className="space-y-4 animate-in fade-in duration-200 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Active Platform Governance Proposals (AIPs)
                </h3>
                <p className="text-gray-400 text-xs">
                  TWE token holders participate in on-chain platform governance, fee schedules, asset onboarding, and risk threshold votes.
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                1 TWE = 1 Governance Vote
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {proposals.map((proposal) => {
                const userVote = votedProposals[proposal.id];
                const totalVotes = proposal.votesFor + proposal.votesAgainst;
                const forPercent = ((proposal.votesFor / totalVotes) * 100).toFixed(1);
                return (
                  <div
                    key={proposal.id}
                    className="p-4 rounded-xl bg-[#0D0D14] border border-[#222234] flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                          {proposal.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            proposal.status === "ACTIVE"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {proposal.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-xs leading-snug">
                        {proposal.title}
                      </h4>

                      <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                        {proposal.description}
                      </p>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Support ({forPercent}%):</span>
                          <span className="text-emerald-400 font-bold">
                            {(proposal.votesFor / 1000000).toFixed(2)}M TWE
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${forPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1E1E2C] flex items-center justify-between gap-2">
                      {userVote ? (
                        <div className="w-full py-1.5 text-center rounded bg-[#161622] text-amber-400 font-bold text-xs border border-amber-500/30">
                          ✓ Voted: {userVote}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVote(proposal.id, "FOR")}
                            className="flex-1 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                          >
                            Vote FOR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(proposal.id, "AGAINST")}
                            className="flex-1 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer"
                          >
                            Vote AGAINST
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4C: Liquidity & Staking Incentives */}
        {activeUtilityTab === "staking_incentives" && (
          <div className="space-y-4 animate-in fade-in duration-200 font-mono text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Market Maker Staking Pool (8.5% APY)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    Institutional Rewards
                  </span>
                </div>

                <p className="text-xs text-gray-300 font-sans leading-relaxed">
                  Market makers stake TWE to unlock colocated Direct Market Access (DMA), 140µs execution priority, and earn daily validator/liquidity provider fee shares derived from global ATS matching volume.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 block">
                    Amount of TWE to Stake:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={stakedTweAmount}
                      onChange={(e) => setStakedTweAmount(Math.max(1000, Number(e.target.value)))}
                      step="5000"
                      className="flex-1 py-2 px-3 rounded-lg bg-[#14141E] border border-[#2A2A3E] text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleStakeTwe}
                      disabled={isStakingLoading}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer transition shadow-md disabled:opacity-50"
                    >
                      {isStakingLoading ? "Staking..." : "Stake TWE"}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#14141E] border border-[#26263A] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px]">Annual Staking Yield</span>
                    <span className="text-emerald-400 font-bold text-sm">8.50% APY</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px]">Projected Rewards</span>
                    <span className="text-amber-400 font-bold text-sm">
                      +{(stakedTweAmount * 0.085).toLocaleString()} TWE / yr
                    </span>
                  </div>
                </div>
              </div>

              {/* Institutional API Routing Specification */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-[#0D0D14] border border-[#222234] space-y-3">
                <span className="font-bold text-white text-sm block border-b border-[#1E1E2C] pb-2">
                  Unlocked Staking Privileges &amp; Latency Tiers
                </span>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#14141E] border border-cyan-500/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Direct Market Access (DMA) Colocation</div>
                      <div className="text-[10px] text-gray-400">140 µs NY4 / Equinix Secaucus Direct Cross-Connect</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                      250K+ TWE
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#14141E] border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Maker Fee Rebate Distribution</div>
                      <div className="text-[10px] text-gray-400">Earn +0.08% rebate on passive limit order fills</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      50K+ TWE
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#14141E] border border-purple-500/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Priority Matching Queue Position</div>
                      <div className="text-[10px] text-gray-400">Zero-allocation queue skip for qualified market makers</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      10K+ TWE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 5: PRODUCTION SMART CONTRACT & SOLIDITY SOURCE CODE
         ========================================================================= */}
      <div className="rounded-2xl bg-[#101016] border border-[#222232] p-6 space-y-4 shadow-xl font-mono text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1E1E2C] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-white text-sm">
                TokenWorldExchangeATS.sol (Ticker: TWE)
              </h3>
              <p className="text-[11px] text-gray-400">
                Audited Smart Contract Standard with SEC Rule 15c3-5 and T+0 Atomic DvP Settlement Hooks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(tweContractSource);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181824] hover:bg-[#202030] text-gray-200 border border-[#2E2E42] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedCode ? "Copied Source!" : "Copy Solidity Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadDocumentFile("TokenWorldExchangeATS.sol", tweContractSource, "text/plain")}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Download .sol</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-[#09090E] border border-[#1A1A24] overflow-x-auto text-[11px] text-cyan-300 leading-relaxed max-h-72">
          {tweContractSource}
        </pre>
      </div>

      {/* Institutional Venue Attribution Footer */}
      <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#1C1C28] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-gray-400">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-400" />
          <span className="text-gray-200 font-bold">Token World Exchange ATS® (TWE)</span>
          <span>&bull; NYSE &amp; SEC Regulation ATS Dual-Listing Engine</span>
        </div>
        <div>
          <span>Sole Owner &amp; Creator: Mauro Lomibao Dar III &bull; maurodar08@gmail.com</span>
        </div>
      </div>
    </div>
  );
};
