import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Filter,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ExternalLink,
  SlidersHorizontal,
  Flame,
  Zap,
  Check,
  Copy,
  Info,
  Layers,
  Scale,
  Binary,
  PieChart,
  FileSpreadsheet
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  runBatchThreatScan,
  remediateToken,
  batchRemediateTokens,
  exportThreatReportToCsv,
  BatchThreatReport,
  TokenThreatAssessment,
  ThreatSeverity,
  ThreatCategory,
  CATEGORY_METADATA,
} from "../utils/securityThreatScanner";
import { ChainIcon } from "./ChainIcon";

interface SecurityThreatScannerProps {
  tokens: TokenRecord[];
  onUpdateTokens?: (updatedTokens: TokenRecord[]) => void;
  onSelectToken?: (token: TokenRecord) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SecurityThreatScanner: React.FC<SecurityThreatScannerProps> = ({
  tokens,
  onUpdateTokens,
  onSelectToken,
  onNavigateToTab,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<ThreatSeverity | "ALL">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<ThreatCategory | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"threat_desc" | "threat_asc" | "mcap_desc" | "holders_asc" | "name_asc">("threat_desc");
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [remediationFeedback, setRemediationFeedback] = useState<string | null>(null);

  // Compute Batch Threat Report
  const report: BatchThreatReport = useMemo(() => {
    return runBatchThreatScan(tokens);
  }, [tokens]);

  const handleRunRescan = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleExportCsv = () => {
    const csvContent = exportThreatReportToCsv(report);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `security-threat-report-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `security-threat-report-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Single Token Remediation
  const handleRemediateSingleToken = (
    tokenId: string,
    action: "all" | "renounce" | "lock_liquidity" | "vesting"
  ) => {
    if (!onUpdateTokens) return;
    const targetToken = tokens.find((t) => t.id === tokenId);
    if (!targetToken) return;

    let remediated: TokenRecord;
    if (action === "renounce") {
      remediated = remediateToken(targetToken, { lockLiquidity: false, vestDistribution: false });
    } else if (action === "lock_liquidity") {
      remediated = remediateToken(targetToken, { renounceOwnership: false, vestDistribution: false });
    } else if (action === "vesting") {
      remediated = remediateToken(targetToken, { renounceOwnership: false, lockLiquidity: false });
    } else {
      remediated = remediateToken(targetToken);
    }

    const updated = tokens.map((t) => (t.id === tokenId ? remediated : t));
    onUpdateTokens(updated);
    setRemediationFeedback(`Successfully secured ${remediated.symbol} (${remediated.name})`);
    setTimeout(() => setRemediationFeedback(null), 4000);
  };

  // Batch Remediation
  const handleBatchRemediateAll = () => {
    if (!onUpdateTokens) return;
    const vulnerableCount = report.assessments.filter((a) => a.overallStatus !== "SAFE").length;
    if (vulnerableCount === 0) {
      setRemediationFeedback("All tokens in the active batch already meet pristine security requirements.");
      setTimeout(() => setRemediationFeedback(null), 3500);
      return;
    }

    const remediated = batchRemediateTokens(tokens);
    onUpdateTokens(remediated);
    setRemediationFeedback(`Auto-Remediated ${vulnerableCount} vulnerable tokens! Ownership renounced to 0x0...dEaD, liquidity locked in Rug-Proof Vault, and 24m vesting applied.`);
    setTimeout(() => setRemediationFeedback(null), 6000);
  };

  // Filter & Sort assessments
  const filteredAssessments = useMemo(() => {
    let result = report.assessments;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.token.name.toLowerCase().includes(q) ||
          a.token.symbol.toLowerCase().includes(q) ||
          a.token.contractAddress.toLowerCase().includes(q) ||
          a.token.chain.toLowerCase().includes(q) ||
          a.findings.some(
            (f) =>
              f.title.toLowerCase().includes(q) ||
              f.heuristicRule.toLowerCase().includes(q) ||
              f.description.toLowerCase().includes(q)
          )
      );
    }

    // Severity filter
    if (selectedSeverity !== "ALL") {
      result = result.filter((a) => a.overallStatus === selectedSeverity);
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      result = result.filter((a) => a.findings.some((f) => f.category === selectedCategory));
    }

    // Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "threat_desc":
          return b.threatScore - a.threatScore;
        case "threat_asc":
          return a.threatScore - b.threatScore;
        case "mcap_desc":
          return (b.token.marketCap || 0) - (a.token.marketCap || 0);
        case "holders_asc":
          return (a.token.holderCount || 0) - (b.token.holderCount || 0);
        case "name_asc":
          return a.token.name.localeCompare(b.token.name);
        default:
          return b.threatScore - a.threatScore;
      }
    });
  }, [report.assessments, searchQuery, selectedSeverity, selectedCategory, sortBy]);

  // Overall risk color helpers
  const getSeverityColor = (sev: ThreatSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return {
          text: "text-rose-400",
          border: "border-rose-500/40",
          bg: "bg-rose-950/20",
          dot: "bg-rose-500",
        };
      case "HIGH":
        return {
          text: "text-orange-400",
          border: "border-orange-500/40",
          bg: "bg-orange-950/20",
          dot: "bg-orange-500",
        };
      case "MEDIUM":
        return {
          text: "text-amber-400",
          border: "border-amber-500/40",
          bg: "bg-amber-950/20",
          dot: "bg-amber-500",
        };
      case "LOW":
        return {
          text: "text-cyan-400",
          border: "border-cyan-500/40",
          bg: "bg-cyan-950/20",
          dot: "bg-cyan-500",
        };
      case "SAFE":
        return {
          text: "text-emerald-400",
          border: "border-emerald-500/40",
          bg: "bg-emerald-950/20",
          dot: "bg-emerald-500",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Feedback Banner */}
      {remediationFeedback && (
        <div className="bg-[#121E1E] border border-emerald-500/40 rounded-xl p-4 flex items-start justify-between gap-3 text-emerald-200 text-sm shadow-lg shadow-emerald-950/20 transition-all">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{remediationFeedback}</span>
          </div>
          <button
            onClick={() => setRemediationFeedback(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200 font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header & Heuristic Cockpit */}
      <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-6 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-rose-400 uppercase tracking-widest font-mono mb-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Heuristic Vulnerability Intelligence Engine</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#8B949E]">Active Batch Diagnostics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Security Threat Scanner
              <span className="text-xs px-2.5 py-1 rounded bg-[#161B22] border border-[#30363D] text-[#C9D1D9] font-mono font-normal">
                {report.totalTokensScanned} Tokens Scanned
              </span>
            </h1>
            <p className="text-sm text-[#8B949E] mt-1.5 max-w-3xl leading-relaxed">
              Automated heuristic deep scan across metadata, ownership structures, and tokenomics distributions.
              Detects un-renounced single-key privileges, insider whale concentration without lockups, unprotected AMM liquidity pools, and deterministic key spoofing vectors.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRunRescan}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] hover:text-white border border-[#30363D] text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-cyan-400" : ""}`} />
              <span>{isScanning ? `Scanning (${scanProgress}%)` : "Re-Scan Batch"}</span>
            </button>

            <button
              onClick={handleBatchRemediateAll}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/30 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>Auto-Remediate Batch</span>
            </button>

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab("maximum_security")}
                className="px-3.5 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="Open Enterprise Maximum Security Lifecycle Command Center (IaC, Zero Trust, SIEM, WORM)"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enterprise Max Security</span>
              </button>
            )}

            <div className="relative group">
              <button
                onClick={handleExportCsv}
                className="px-3 py-2 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#C9D1D9] border border-[#30363D] text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Export CSV Threat Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <button
              onClick={handleExportJson}
              className="px-3 py-2 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#C9D1D9] border border-[#30363D] text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Export JSON Threat Report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Progress Bar (Visible during scan) */}
        {isScanning && (
          <div className="mt-4 w-full bg-[#161B22] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-[#21262D]">
          {/* Average Threat Score Card */}
          <div className="p-3.5 rounded-xl bg-[#161B22] border border-[#30363D]">
            <div className="text-[11px] text-[#8B949E] font-mono uppercase tracking-wider mb-1">
              Batch Threat Index
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono ${report.averageThreatScore >= 50 ? "text-rose-400" : report.averageThreatScore >= 25 ? "text-amber-400" : "text-emerald-400"}`}>
                {report.averageThreatScore}
              </span>
              <span className="text-xs text-[#8B949E]">/ 100</span>
            </div>
            <div className="text-[10px] text-[#8B949E] mt-1 font-mono">
              Status: <span className={getSeverityColor(report.overallBatchRisk).text}>{report.overallBatchRisk}</span>
            </div>
          </div>

          {/* Critical Risk Filter Card */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === "CRITICAL" ? "ALL" : "CRITICAL")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedSeverity === "CRITICAL"
                ? "bg-rose-950/40 border-rose-500 text-white shadow-sm shadow-rose-950/40 ring-1 ring-rose-500/50"
                : "bg-[#161B22] border-[#30363D] hover:border-rose-500/40 text-[#C9D1D9]"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Critical
              </span>
              <span className="text-xs font-mono">{report.criticalTokensCount}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {report.criticalTokensCount}
            </div>
            <div className="text-[10px] text-[#8B949E] mt-1">
              Requires immediate action
            </div>
          </button>

          {/* High Risk Filter Card */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === "HIGH" ? "ALL" : "HIGH")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedSeverity === "HIGH"
                ? "bg-orange-950/40 border-orange-500 text-white shadow-sm shadow-orange-950/40 ring-1 ring-orange-500/50"
                : "bg-[#161B22] border-[#30363D] hover:border-orange-500/40 text-[#C9D1D9]"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="text-orange-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                High Risk
              </span>
              <span className="text-xs font-mono">{report.highRiskTokensCount}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {report.highRiskTokensCount}
            </div>
            <div className="text-[10px] text-[#8B949E] mt-1">
              Significant exposure
            </div>
          </button>

          {/* Medium Risk Filter Card */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === "MEDIUM" ? "ALL" : "MEDIUM")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedSeverity === "MEDIUM"
                ? "bg-amber-950/40 border-amber-500 text-white shadow-sm shadow-amber-950/40 ring-1 ring-amber-500/50"
                : "bg-[#161B22] border-[#30363D] hover:border-amber-500/40 text-[#C9D1D9]"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Medium
              </span>
              <span className="text-xs font-mono">{report.mediumRiskTokensCount}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {report.mediumRiskTokensCount}
            </div>
            <div className="text-[10px] text-[#8B949E] mt-1">
              Cautionary warnings
            </div>
          </button>

          {/* Low Risk Filter Card */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === "LOW" ? "ALL" : "LOW")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedSeverity === "LOW"
                ? "bg-cyan-950/40 border-cyan-500 text-white shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/50"
                : "bg-[#161B22] border-[#30363D] hover:border-cyan-500/40 text-[#C9D1D9]"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                Low Risk
              </span>
              <span className="text-xs font-mono">{report.lowRiskTokensCount}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {report.lowRiskTokensCount}
            </div>
            <div className="text-[10px] text-[#8B949E] mt-1">
              Minor advisories
            </div>
          </button>

          {/* Safe Filter Card */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === "SAFE" ? "ALL" : "SAFE")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedSeverity === "SAFE"
                ? "bg-emerald-950/40 border-emerald-500 text-white shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/50"
                : "bg-[#161B22] border-[#30363D] hover:border-emerald-500/40 text-[#C9D1D9]"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Safe / Pristine
              </span>
              <span className="text-xs font-mono">{report.safeTokensCount}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {report.safeTokensCount}
            </div>
            <div className="text-[10px] text-[#8B949E] mt-1">
              Full compliance verified
            </div>
          </button>
        </div>

        {/* Vulnerability Prevalence Breakdown Bar */}
        <div className="mt-6 pt-5 border-t border-[#21262D]">
          <div className="text-xs text-[#8B949E] font-medium mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#58A6FF]" />
              Active Heuristic Vulnerability Vector Prevalence:
            </span>
            <span className="font-mono text-[11px] text-[#8B949E]">
              Evaluated across 6 heuristic suites in {report.scanDurationMs}ms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(Object.entries(report.categoryBreakdown) as [ThreatCategory, typeof report.categoryBreakdown[ThreatCategory]][]).map(
              ([cat, stat]) => {
                const meta = CATEGORY_METADATA[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isSelected ? "ALL" : cat)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-[#1C2128] border-cyan-500/60 ring-1 ring-cyan-500/30"
                        : "bg-[#161B22] border-[#30363D] hover:border-[#8B949E]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#C9D1D9] truncate">
                        {meta.label}
                      </span>
                      <span className={`font-mono text-xs ${stat.affectedCount > 0 ? "text-amber-400 font-semibold" : "text-[#8B949E]"}`}>
                        {stat.affectedCount} ({stat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#0D1117] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          stat.maxSeverity === "CRITICAL"
                            ? "bg-rose-500"
                            : stat.maxSeverity === "HIGH"
                            ? "bg-orange-500"
                            : stat.maxSeverity === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.max(4, stat.percentage)}%` }}
                      />
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Top Recurring Vulnerabilities Alert Strip */}
      {report.topVulnerabilities.length > 0 && (
        <div className="bg-[#12171F] border border-[#263040] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C9D1D9] uppercase tracking-wider mb-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Top Detected Threat Vectors in Active Batch</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {report.topVulnerabilities.slice(0, 3).map((vuln, idx) => (
              <div
                key={idx}
                className="bg-[#161E2B] border border-[#2A374A] rounded-lg p-2.5 flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-medium text-white line-clamp-1">{vuln.name}</div>
                  <div className="text-[11px] text-[#8B949E] mt-0.5">
                    Category: <span className="text-[#58A6FF]">{CATEGORY_METADATA[vuln.category]?.label || vuln.category}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    vuln.severity === "CRITICAL"
                      ? "bg-rose-950/60 text-rose-300 border border-rose-500/40"
                      : "bg-orange-950/60 text-orange-300 border border-orange-500/40"
                  }`}>
                    {vuln.count} tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0D1117] border border-[#21262D] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search token name, symbol, address, rule..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#161B22] border border-[#30363D] text-[#C9D1D9] placeholder-[#8B949E] text-xs focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Severity Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#161B22] rounded-lg border border-[#30363D] overflow-x-auto w-full md:w-auto">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "SAFE"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedSeverity === sev
                  ? "bg-[#21262D] text-white shadow-sm font-semibold"
                  : "text-[#8B949E] hover:text-[#C9D1D9]"
              }`}
            >
              {sev === "ALL" ? "All Severities" : sev}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-[#8B949E] whitespace-nowrap flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-[#161B22] border border-[#30363D] text-[#C9D1D9] text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="threat_desc">Threat Score (Highest Risk)</option>
            <option value="threat_asc">Threat Score (Safest First)</option>
            <option value="mcap_desc">Market Cap (Highest)</option>
            <option value="holders_asc">Holder Count (Lowest float)</option>
            <option value="name_asc">Token Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {(selectedSeverity !== "ALL" || selectedCategory !== "ALL" || searchQuery.trim()) && (
        <div className="flex items-center gap-2 text-xs text-[#8B949E] flex-wrap">
          <span>Active Filters:</span>
          {selectedSeverity !== "ALL" && (
            <span className="bg-[#161B22] border border-[#30363D] px-2 py-0.5 rounded text-white flex items-center gap-1">
              Severity: {selectedSeverity}
              <button onClick={() => setSelectedSeverity("ALL")} className="hover:text-rose-400">×</button>
            </span>
          )}
          {selectedCategory !== "ALL" && (
            <span className="bg-[#161B22] border border-[#30363D] px-2 py-0.5 rounded text-white flex items-center gap-1">
              Category: {CATEGORY_METADATA[selectedCategory]?.label}
              <button onClick={() => setSelectedCategory("ALL")} className="hover:text-rose-400">×</button>
            </span>
          )}
          {searchQuery.trim() && (
            <span className="bg-[#161B22] border border-[#30363D] px-2 py-0.5 rounded text-white flex items-center gap-1">
              Search: "{searchQuery}"
              <button onClick={() => setSearchQuery("")} className="hover:text-rose-400">×</button>
            </span>
          )}
          <button
            onClick={() => {
              setSelectedSeverity("ALL");
              setSelectedCategory("ALL");
              setSearchQuery("");
            }}
            className="text-cyan-400 hover:underline ml-2"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Assessment List */}
      <div className="space-y-3">
        {filteredAssessments.length === 0 ? (
          <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Matching Vulnerabilities Found</h3>
            <p className="text-xs text-[#8B949E] mt-1 max-w-md mx-auto">
              No tokens in the active batch match your filter criteria or all tokens meet clean security standards under this filter.
            </p>
          </div>
        ) : (
          filteredAssessments.map((assessment) => {
            const isExpanded = expandedTokenId === assessment.tokenId;
            const sevColor = getSeverityColor(assessment.overallStatus);
            const token = assessment.token;

            return (
              <div
                key={assessment.tokenId}
                className={`bg-[#0D1117] border rounded-xl transition-all overflow-hidden ${
                  assessment.overallStatus === "CRITICAL"
                    ? "border-rose-900/40 hover:border-rose-500/50"
                    : assessment.overallStatus === "HIGH"
                    ? "border-orange-900/40 hover:border-orange-500/50"
                    : assessment.overallStatus === "MEDIUM"
                    ? "border-amber-900/40 hover:border-amber-500/50"
                    : "border-[#21262D] hover:border-[#30363D]"
                }`}
              >
                {/* Main Card Header Bar */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Token Identity */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="relative shrink-0 mt-0.5 sm:mt-0">
                      <ChainIcon chain={token.chain} className="w-8 h-8 rounded-lg" />
                      <span
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0D1117] ${sevColor.dot}`}
                        title={`Threat Status: ${assessment.overallStatus}`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">
                          {token.name}
                        </span>
                        <span className="font-mono text-xs text-[#8B949E] font-medium">
                          ${token.symbol}
                        </span>
                        <span className="text-[10px] font-mono text-[#58A6FF] px-1.5 py-0.5 rounded bg-[#161B22] border border-[#30363D]">
                          {token.tokenStandard}
                        </span>
                        <span className="text-[10px] font-mono text-[#C9D1D9] capitalize">
                          {token.chain}
                        </span>
                      </div>

                      {/* Clean Unboxed Metadata Line (Anti-AI Slop Zero-Pill) */}
                      <div className="flex items-center gap-2 text-xs text-[#8B949E] mt-1 font-mono flex-wrap">
                        {/* Contract address */}
                        <div className="flex items-center gap-1">
                          <span>Addr: {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}</span>
                          <button
                            onClick={() => handleCopyAddress(token.contractAddress)}
                            className="text-[#8B949E] hover:text-white p-0.5"
                            title="Copy Contract Address"
                          >
                            {copiedAddress === token.contractAddress ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span aria-hidden="true">·</span>
                        {/* Ownership status */}
                        <span>
                          Ownership:{" "}
                          <strong className={assessment.isOwnershipRenounced ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                            {assessment.isOwnershipRenounced ? "Renounced (0x0...dEaD)" : "Active Single-Owner"}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        {/* Liquidity status */}
                        <span>
                          Liquidity:{" "}
                          <strong className={assessment.liquidityLockStatus === "LOCKED" ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                            {token.launchStatus}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        {/* Holders & MCAP */}
                        <span>{token.holderCount.toLocaleString()} Holders</span>
                        <span aria-hidden="true">·</span>
                        <span>${((token.marketCap || 0) / 1e6).toFixed(2)}M MCap</span>
                      </div>
                    </div>
                  </div>

                  {/* Threat Score & Expand Actions */}
                  <div className="flex items-center gap-3 shrink-0 justify-between lg:justify-end">
                    {/* Vulnerability Counts */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {assessment.vulnerabilityCount.critical > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold">
                          {assessment.vulnerabilityCount.critical} Critical
                        </span>
                      )}
                      {assessment.vulnerabilityCount.high > 0 && (
                        <span className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-500/40 text-orange-300 font-bold">
                          {assessment.vulnerabilityCount.high} High
                        </span>
                      )}
                      {assessment.vulnerabilityCount.medium > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-medium">
                          {assessment.vulnerabilityCount.medium} Med
                        </span>
                      )}
                      {assessment.findings.length === 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          0 Threats
                        </span>
                      )}
                    </div>

                    {/* Threat Score Gauge */}
                    <div className="text-right">
                      <div className="text-[10px] text-[#8B949E] uppercase font-mono tracking-wider">
                        Risk Score
                      </div>
                      <div className={`text-base font-bold font-mono ${sevColor.text}`}>
                        {assessment.threatScore} / 100
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => setExpandedTokenId(isExpanded ? null : assessment.tokenId)}
                      className="px-3 py-1.5 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#C9D1D9] hover:text-white border border-[#30363D] text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <span>{isExpanded ? "Hide Details" : "Inspect Findings"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Findings Drawer */}
                {isExpanded && (
                  <div className="border-t border-[#21262D] bg-[#0A0D12] p-5 space-y-4">
                    {/* Remediation Toolbar for this Token */}
                    <div className="bg-[#12161E] border border-[#212A36] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="text-xs text-[#8B949E]">
                        Target Owner:{" "}
                        <span className="font-mono text-white">
                          {token.targetOwner || token.deployerAddress || "Unset"}
                        </span>
                        {assessment.isOwnershipRenounced && (
                          <span className="text-emerald-400 ml-1.5 font-semibold">
                            (Renounced ✓)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {onSelectToken && (
                          <button
                            onClick={() => onSelectToken(token)}
                            className="px-2.5 py-1 rounded bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#C9D1D9] border border-[#30363D] text-[11px] font-medium transition-colors"
                          >
                            Select in Foundry
                          </button>
                        )}

                        {!assessment.isOwnershipRenounced && onUpdateTokens && (
                          <button
                            onClick={() => handleRemediateSingleToken(token.id, "renounce")}
                            className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 text-[11px] font-medium transition-colors"
                          >
                            Renounce Ownership
                          </button>
                        )}

                        {assessment.liquidityLockStatus !== "LOCKED" && onUpdateTokens && (
                          <button
                            onClick={() => handleRemediateSingleToken(token.id, "lock_liquidity")}
                            className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-500/40 text-[11px] font-medium transition-colors"
                          >
                            Lock Liquidity in Vault
                          </button>
                        )}

                        {onUpdateTokens && assessment.findings.length > 0 && (
                          <button
                            onClick={() => handleRemediateSingleToken(token.id, "all")}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Remediate All Threats
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detailed Findings List */}
                    {assessment.findings.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>All heuristic integrity vectors passed. Zero vulnerabilities detected in metadata, ownership structure, or distribution profiles.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                          Heuristic Vulnerability Findings ({assessment.findings.length})
                        </div>

                        {assessment.findings.map((finding) => (
                          <div
                            key={finding.id}
                            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                              finding.severity === "CRITICAL"
                                ? "bg-rose-950/15 border-rose-500/30 text-rose-100"
                                : finding.severity === "HIGH"
                                ? "bg-orange-950/15 border-orange-500/30 text-orange-100"
                                : finding.severity === "MEDIUM"
                                ? "bg-amber-950/15 border-amber-500/30 text-amber-100"
                                : "bg-cyan-950/15 border-cyan-500/30 text-cyan-100"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 font-semibold text-white">
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                                  finding.severity === "CRITICAL"
                                    ? "bg-rose-500 text-black"
                                    : finding.severity === "HIGH"
                                    ? "bg-orange-500 text-black"
                                    : "bg-amber-500 text-black"
                                }`}>
                                  {finding.severity}
                                </span>
                                <span className="text-sm">{finding.title}</span>
                              </div>
                              <span className="font-mono text-[10px] text-[#8B949E] shrink-0">
                                {finding.heuristicRule}
                              </span>
                            </div>

                            <p className="text-[#C9D1D9] leading-relaxed">
                              {finding.description}
                            </p>

                            {/* Threat Impact */}
                            <div className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
                              <div className="text-[11px] font-semibold text-white">
                                Potential Threat Impact:
                              </div>
                              <div className="text-[11px] text-[#8B949E]">
                                {finding.impact}
                              </div>
                            </div>

                            {/* Evidence & Remediation */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                              <div>
                                <span className="text-[#8B949E]">Evidence: </span>
                                <span className="text-white">{finding.evidence}</span>
                              </div>
                              <div>
                                <span className="text-emerald-400">Remediation: </span>
                                <span className="text-[#C9D1D9]">{finding.remediation}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Metadata Diagnostic Breakdown */}
                    <div className="pt-2 border-t border-[#21262D]">
                      <div className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider mb-2">
                        Metadata & Tokenomics Profile Breakdown
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D]">
                          <div className="text-[10px] text-[#8B949E]">Initial Supply</div>
                          <div className="font-mono font-medium text-white truncate">
                            {token.initialSupply}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D]">
                          <div className="text-[10px] text-[#8B949E]">Audit Certification</div>
                          <div className="font-mono font-medium text-white truncate">
                            {token.auditFirm} ({token.securityScore}/100)
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D]">
                          <div className="text-[10px] text-[#8B949E]">Entropy Signature (256-Bit)</div>
                          <div className="font-mono font-medium text-white truncate" title={token.quantum_entropy_signature}>
                            {token.quantum_entropy_signature.slice(0, 16)}...
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D]">
                          <div className="text-[10px] text-[#8B949E]">Liquidity Pair</div>
                          <div className="font-mono font-medium text-white truncate">
                            {token.liquidityPair || "Uniswap v3"}
                          </div>
                        </div>
                      </div>

                      {/* Tokenomics allocation list */}
                      {token.tokenomics?.tokenomics && token.tokenomics.tokenomics.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider mb-1.5">
                            Distribution Splits & Lockup Schedules
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {token.tokenomics.tokenomics.map((alloc, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded bg-[#161B22] border border-[#30363D] text-[11px]"
                              >
                                <div className="flex items-center justify-between font-medium text-white">
                                  <span>{alloc.category}</span>
                                  <span className="font-mono">{alloc.percentage}%</span>
                                </div>
                                <div className="text-[10px] text-[#8B949E] mt-0.5 font-mono">
                                  Lock: <span className={alloc.lockup && alloc.lockup !== "None" ? "text-emerald-400" : "text-rose-400"}>{alloc.lockup || "No Lockup"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
