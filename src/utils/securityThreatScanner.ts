import { TokenRecord, LaunchStatus } from "../types";

export type ThreatSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";

export type ThreatCategory =
  | "OWNERSHIP_RENOUNCEMENT"
  | "DISTRIBUTION_PATTERNS"
  | "LIQUIDITY_LOCK"
  | "SUPPLY_INFLATION"
  | "ENTROPY_SIGNATURE"
  | "AUDIT_COMPLIANCE";

export interface ThreatFinding {
  id: string;
  category: ThreatCategory;
  severity: ThreatSeverity;
  title: string;
  description: string;
  impact: string;
  heuristicRule: string;
  evidence: string;
  remediation: string;
  isAutoRemediable: boolean;
}

export interface TokenThreatAssessment {
  tokenId: string;
  token: TokenRecord;
  threatScore: number; // 0 (pristine/safe) to 100 (critical risk)
  overallStatus: ThreatSeverity;
  findings: ThreatFinding[];
  vulnerabilityCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  isOwnershipRenounced: boolean;
  distributionRiskLevel: "BALANCED" | "MODERATE" | "HIGH_CONCENTRATION" | "WHALE_DOMINATED";
  liquidityLockStatus: "LOCKED" | "PARTIALLY_LOCKED" | "UNLOCKED_AT_RISK";
  scannedAt: string;
}

export interface BatchThreatReport {
  batchId: string;
  totalTokensScanned: number;
  overallBatchRisk: ThreatSeverity;
  averageThreatScore: number;
  criticalTokensCount: number;
  highRiskTokensCount: number;
  mediumRiskTokensCount: number;
  lowRiskTokensCount: number;
  safeTokensCount: number;
  categoryBreakdown: Record<
    ThreatCategory,
    { affectedCount: number; percentage: number; maxSeverity: ThreatSeverity }
  >;
  topVulnerabilities: Array<{
    name: string;
    count: number;
    severity: ThreatSeverity;
    category: ThreatCategory;
  }>;
  assessments: TokenThreatAssessment[];
  scanDurationMs: number;
  scannedTimestamp: string;
}

export const CATEGORY_METADATA: Record<
  ThreatCategory,
  { label: string; description: string; iconKey: string }
> = {
  OWNERSHIP_RENOUNCEMENT: {
    label: "Ownership Renouncement & Governance",
    description: "Evaluates privileged admin roles, single-key custody, and un-renounced owner authority.",
    iconKey: "ShieldAlert",
  },
  DISTRIBUTION_PATTERNS: {
    label: "Supply & Distribution Patterns",
    description: "Scans metadata for insider concentration, unvested team cliffs, and whale disparity.",
    iconKey: "PieChart",
  },
  LIQUIDITY_LOCK: {
    label: "AMM Liquidity Protection",
    description: "Inspects pair status, LP time-locks, and sudden drain/rug-pull vectors.",
    iconKey: "Lock",
  },
  SUPPLY_INFLATION: {
    label: "Supply Cap & Mint Guards",
    description: "Verifies uint256 boundaries, uncapped mint functions, and inflationary traps.",
    iconKey: "TrendingUp",
  },
  ENTROPY_SIGNATURE: {
    label: "Entropy & Address Integrity",
    description: "Detects low-entropy key generation, pseudo-random vanity collisions, and key hygiene.",
    iconKey: "Binary",
  },
  AUDIT_COMPLIANCE: {
    label: "Audit & Certification Assurance",
    description: "Cross-checks formal verification firms, certification scores, and compliance baselines.",
    iconKey: "FileCheck",
  },
};

/**
 * Calculates Shannon entropy of a hex string (0 to 4.0 bits for base-16)
 */
function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const clean = str.replace(/^0x/, "").toLowerCase();
  const freq: Record<string, number> = {};
  for (const ch of clean) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  const len = clean.length;
  for (const key in freq) {
    const p = freq[key] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Checks whether an address represents a standard renounced null address
 */
export function isRenouncedAddress(address?: string | null): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return (
    normalized === "0x0000000000000000000000000000000000000000" ||
    normalized === "0x000000000000000000000000000000000000dead" ||
    normalized === "0xdead000000000000000000000000000000000000" ||
    normalized === "0x0000000000000000000000000000000000000001"
  );
}

/**
 * Run heuristic security threat analysis on an individual token
 */
export function analyzeTokenThreats(token: TokenRecord): TokenThreatAssessment {
  const findings: ThreatFinding[] = [];
  let threatScorePoints = 0;

  // -------------------------------------------------------------
  // HEURISTIC 1: OWNERSHIP RENOUNCEMENT & GOVERNANCE PRIVILEGE
  // -------------------------------------------------------------
  const targetOwner = token.targetOwner?.trim();
  const deployer = token.deployerAddress?.trim();
  const isTargetRenounced = isRenouncedAddress(targetOwner);
  const noteMentionsRenounced = Boolean(
    token.marketEvolutionNote?.toLowerCase().includes("renounced") ||
    token.tags?.some((t) => t.toLowerCase().includes("renounce"))
  );
  const isRugProofVault = token.launchStatus === "Rug-Proof Vault";

  const isOwnershipRenounced = isTargetRenounced || noteMentionsRenounced || isRugProofVault;

  if (!isOwnershipRenounced) {
    const isSingleKeyDeployer =
      !targetOwner ||
      targetOwner.toLowerCase() === deployer?.toLowerCase() ||
      targetOwner.startsWith("0x");

    if (isSingleKeyDeployer) {
      findings.push({
        id: `OWNERSHIP_NOT_RENOUNCED_${token.id}`,
        category: "OWNERSHIP_RENOUNCEMENT",
        severity: "CRITICAL",
        title: "Lack of Ownership Renouncement",
        description: "The contract retains an active, un-renounced owner address with privileged administrative controls.",
        impact: "The designated owner can arbitrarily invoke privileged functions (e.g., fee modifications, contract pause, parameter tampering, or privileged minting) without timelock or community governance approval.",
        heuristicRule: "RULE-SEC-01: Privileged Single-Key Ownership Authority",
        evidence: `Target owner (${targetOwner || deployer || "Unspecified EOA"}) matches active deployer/single address. Zero renouncement transaction detected.`,
        remediation: "Execute renounceOwnership() to irrevocably transfer contract authority to 0x000000000000000000000000000000000000dEaD, or transfer ownership to a verified 48h Timelock Multi-Sig Safe.",
        isAutoRemediable: true,
      });
      threatScorePoints += 38;
    }
  }

  // -------------------------------------------------------------
  // HEURISTIC 2: HIGH-RISK DISTRIBUTION PATTERNS IN METADATA
  // -------------------------------------------------------------
  let distributionRisk: "BALANCED" | "MODERATE" | "HIGH_CONCENTRATION" | "WHALE_DOMINATED" = "BALANCED";

  // Check Tokenomics Allocations if available
  const allocations = token.tokenomics?.tokenomics || [];
  let unvestedInsiderPercent = 0;
  let singleLargestAllocation = 0;
  let largestCategory = "";

  for (const alloc of allocations) {
    const categoryLower = alloc.category.toLowerCase();
    const isInsider =
      categoryLower.includes("team") ||
      categoryLower.includes("founder") ||
      categoryLower.includes("advisor") ||
      categoryLower.includes("treasury") ||
      categoryLower.includes("private") ||
      categoryLower.includes("seed");

    const lockupLower = (alloc.lockup || "").toLowerCase();
    const hasLockup =
      lockupLower.includes("year") ||
      lockupLower.includes("month") ||
      lockupLower.includes("cliff") ||
      lockupLower.includes("linear") ||
      lockupLower.includes("vest");

    if (alloc.percentage > singleLargestAllocation) {
      singleLargestAllocation = alloc.percentage;
      largestCategory = alloc.category;
    }

    if (isInsider && !hasLockup) {
      unvestedInsiderPercent += alloc.percentage;
    }
  }

  if (unvestedInsiderPercent >= 35) {
    findings.push({
      id: `UNVESTED_INSIDERS_${token.id}`,
      category: "DISTRIBUTION_PATTERNS",
      severity: "CRITICAL",
      title: "High-Risk Insider Supply Concentration Without Vesting",
      description: `Insiders, team, and private allocations hold ${unvestedInsiderPercent}% of total token supply without any mandatory lockup or cliff period.`,
      impact: "Immediate threat of coordinated liquidity exit or catastrophic price dump upon trading activation.",
      heuristicRule: "RULE-DIST-01: Unvested Insider Concentration",
      evidence: `${unvestedInsiderPercent}% held in insider allocations without lockup parameters in metadata.`,
      remediation: "Apply a strict 24-month linear vesting schedule with a mandatory 6-month cliff via OpenZeppelin VestingWallet.",
      isAutoRemediable: true,
    });
    threatScorePoints += 32;
    distributionRisk = "HIGH_CONCENTRATION";
  } else if (unvestedInsiderPercent >= 20) {
    findings.push({
      id: `MODERATE_INSIDERS_${token.id}`,
      category: "DISTRIBUTION_PATTERNS",
      severity: "HIGH",
      title: "Significant Unvested Insider Allocation",
      description: `Identified ${unvestedInsiderPercent}% of token supply assigned to internal reserves with loose or absent vesting schedules.`,
      impact: "Medium-to-high downside sell pressure if market conditions deteriorate.",
      heuristicRule: "RULE-DIST-01B: Elevated Insider Exposure",
      evidence: `${unvestedInsiderPercent}% of token supply lacking formal cryptographic time-lock confirmation.`,
      remediation: "Bind all insider allocations to an immutable on-chain vesting contract with multi-sig governance release.",
      isAutoRemediable: true,
    });
    threatScorePoints += 20;
    distributionRisk = "MODERATE";
  }

  // Whale Disparity Heuristic (Holder Count vs Market Cap)
  const holders = token.holderCount || 0;
  const mcap = token.marketCap || 0;

  if (holders < 25 && mcap > 1_000_000) {
    findings.push({
      id: `LOW_HOLDER_WHALE_RISK_${token.id}`,
      category: "DISTRIBUTION_PATTERNS",
      severity: "HIGH",
      title: "Severe Holder Disparity & Illiquid Float",
      description: `Only ${holders} holders recorded for a high market capitalization of $${(mcap / 1e6).toFixed(2)}M.`,
      impact: "Extreme vulnerability to whale manipulation and sudden liquidity drain. Indicates artificial or highly centralized initial distribution.",
      heuristicRule: "RULE-DIST-02: Holder Breadth Disparity Heuristic",
      evidence: `Token holds ${holders} addresses holding float valued at $${(mcap / 1e6).toFixed(2)}M (Average holding > $${((mcap / Math.max(holders, 1)) / 1e3).toFixed(1)}k/wallet).`,
      remediation: "Execute broad community liquidity seeding or decentralized airdrop rounds to disperse wallet concentration.",
      isAutoRemediable: false,
    });
    threatScorePoints += 22;
    distributionRisk = "WHALE_DOMINATED";
  } else if (holders < 80 && mcap > 5_000_000) {
    findings.push({
      id: `MODERATE_HOLDER_CONCENTRATION_${token.id}`,
      category: "DISTRIBUTION_PATTERNS",
      severity: "MEDIUM",
      title: "Moderate Float Centralization",
      description: `Holder count of ${holders} is narrow for a protocol with market valuation exceeding $5M.`,
      impact: "Top holders possess disproportionate market influence during low liquidity volume sessions.",
      heuristicRule: "RULE-DIST-02B: Float Concentration Warning",
      evidence: `${holders} holders for $${(mcap / 1e6).toFixed(1)}M market capitalization.`,
      remediation: "Incentivize wider community participation and LP token staking to expand distribution breadth.",
      isAutoRemediable: false,
    });
    threatScorePoints += 12;
    if (distributionRisk === "BALANCED") distributionRisk = "MODERATE";
  }

  // -------------------------------------------------------------
  // HEURISTIC 3: LIQUIDITY LOCK & RUG DEFENSE
  // -------------------------------------------------------------
  let liquidityLockStatus: "LOCKED" | "PARTIALLY_LOCKED" | "UNLOCKED_AT_RISK" = "UNLOCKED_AT_RISK";

  if (token.launchStatus === "Rug-Proof Vault") {
    liquidityLockStatus = "LOCKED";
  } else if (token.launchStatus === "Liquidity Locked") {
    liquidityLockStatus = "LOCKED";
  } else if (token.launchStatus === "Audited" || token.launchStatus === "Deployed") {
    liquidityLockStatus = "PARTIALLY_LOCKED";
    findings.push({
      id: `UNLOCKED_AMM_LIQUIDITY_${token.id}`,
      category: "LIQUIDITY_LOCK",
      severity: "HIGH",
      title: "Uncertified AMM Liquidity Lock",
      description: `Current launch status is '${token.launchStatus}'. No cryptographic proof of time-locked LP tokens detected for pair ${token.liquidityPair || "N/A"}.`,
      impact: "Liquidity provider tokens may be withdrawn by pool deployer at any moment, collapsing the automated market maker pool (Classic Rug Pull).",
      heuristicRule: "RULE-LIQ-01: AMM Liquidity Lock Verification",
      evidence: `Launch status is '${token.launchStatus}' with active pool ${token.liquidityPair || "Uniswap v3"}.`,
      remediation: "Deposit LP tokens into an immutable certified locker (e.g. Unicrypt, Team Finance, or Rug-Proof Vault) with minimum 1-year lock period.",
      isAutoRemediable: true,
    });
    threatScorePoints += 24;
  } else if (token.launchStatus === "Presale" || token.launchStatus === "Paused") {
    liquidityLockStatus = "UNLOCKED_AT_RISK";
    findings.push({
      id: `RISK_LAUNCH_STATUS_${token.id}`,
      category: "LIQUIDITY_LOCK",
      severity: "CRITICAL",
      title: "High-Risk Pre-Launch / Paused Status",
      description: `Token is marked as '${token.launchStatus}'. Trading or token transfers may be halted or restricted.`,
      impact: "Users may purchase tokens but find transfer or selling functions blocked or uninitialized.",
      heuristicRule: "RULE-LIQ-02: Non-Finalized Market State",
      evidence: `Launch status '${token.launchStatus}'.`,
      remediation: "Finalize presale contracts, initialize automated AMM pool, and execute Rug-Proof lockup.",
      isAutoRemediable: true,
    });
    threatScorePoints += 30;
  }

  // -------------------------------------------------------------
  // HEURISTIC 4: SUPPLY INFLATION & CEILING CHECKS
  // -------------------------------------------------------------
  const supplyNumeric = parseFloat(token.initialSupply.replace(/,/g, "")) || 0;
  if (token.tokenStandard === "ERC-20" && !token.tokenomicsPillars?.mathematicalBoundaries?.uint256Ceiling) {
    findings.push({
      id: `UNCAPPED_SUPPLY_RISK_${token.id}`,
      category: "SUPPLY_INFLATION",
      severity: "MEDIUM",
      title: "Missing Immutable Supply Ceiling Guard",
      description: "Smart contract configuration does not explicitly declare OpenZeppelin ERC20Capped or fixed total supply ceiling.",
      impact: "If mint() permissions remain accessible, unauthorized supply inflation can devalue existing tokens.",
      heuristicRule: "RULE-MINT-01: Supply Ceiling Enforcement",
      evidence: `Initial supply: ${token.initialSupply}. No mathematical ceiling confirmation found in contract pillars.`,
      remediation: "Enforce OpenZeppelin ERC20Capped standard or assert require(totalSupply() <= MAX_SUPPLY) on all mint operations.",
      isAutoRemediable: true,
    });
    threatScorePoints += 14;
  }

  // -------------------------------------------------------------
  // HEURISTIC 5: QUANTUM ENTROPY SIGNATURE & KEY HYGIENE
  // -------------------------------------------------------------
  const entropySignature = token.quantum_entropy_signature || "";
  const shannon = calculateShannonEntropy(entropySignature);

  if (!entropySignature || entropySignature.length < 64) {
    findings.push({
      id: `MALFORMED_ENTROPY_${token.id}`,
      category: "ENTROPY_SIGNATURE",
      severity: "HIGH",
      title: "Truncated or Missing Entropy Signature",
      description: "Cryptographic entropy signature is truncated or absent, indicating potential pseudo-random key generation.",
      impact: "Weak seed entropy allows attackers to reverse-engineer deterministic deployment salts and hijack contract addresses.",
      heuristicRule: "RULE-ENT-01: 256-Bit Cryptographic Entropy Verification",
      evidence: `Entropy signature length is ${entropySignature.length} chars (expected 64 hex chars).`,
      remediation: "Regenerate deployment salt and bytecode using CSPRNG crypto.getRandomValues().",
      isAutoRemediable: true,
    });
    threatScorePoints += 18;
  } else if (shannon < 3.5) {
    findings.push({
      id: `LOW_SHANNON_ENTROPY_${token.id}`,
      category: "ENTROPY_SIGNATURE",
      severity: "MEDIUM",
      title: "Low Shannon Entropy in Generation Signature",
      description: `Shannon entropy evaluated to ${shannon.toFixed(2)} bits (expected >= 3.75 bits for CSPRNG 256-bit hex).`,
      impact: "Potential statistical predictability in cryptographic salt generation.",
      heuristicRule: "RULE-ENT-02: Shannon Diversity Analysis",
      evidence: `Shannon score: ${shannon.toFixed(2)} / 4.0 bits.`,
      remediation: "Pass key generation through NIST SP 800-22 compliant whitening transform.",
      isAutoRemediable: true,
    });
    threatScorePoints += 12;
  }

  // -------------------------------------------------------------
  // HEURISTIC 6: AUDIT COMPLIANCE & SCORE VERIFICATION
  // -------------------------------------------------------------
  const auditScore = token.securityScore || 0;
  if (auditScore < 80) {
    findings.push({
      id: `SUBPAR_AUDIT_SCORE_${token.id}`,
      category: "AUDIT_COMPLIANCE",
      severity: "HIGH",
      title: "Sub-Baseline Security Audit Score",
      description: `Security audit score evaluated to only ${auditScore}/100 by ${token.auditFirm}.`,
      impact: "Contract contains known medium or high severity audit warnings that have not been patched.",
      heuristicRule: "RULE-AUD-01: Minimum Security Audit Baseline",
      evidence: `Score: ${auditScore}/100 from ${token.auditFirm}.`,
      remediation: "Address unresolved findings in the audit report and execute a re-audit cycle.",
      isAutoRemediable: false,
    });
    threatScorePoints += 20;
  } else if (auditScore < 90) {
    findings.push({
      id: `MODERATE_AUDIT_SCORE_${token.id}`,
      category: "AUDIT_COMPLIANCE",
      severity: "LOW",
      title: "Minor Audit Advisory Notes",
      description: `Security score is ${auditScore}/100 with pending informational or gas optimization suggestions.`,
      impact: "Minor gas overhead or informational style deviations.",
      heuristicRule: "RULE-AUD-02: Informational Audit Advisory",
      evidence: `Score: ${auditScore}/100.`,
      remediation: "Review informational findings in audit documentation.",
      isAutoRemediable: false,
    });
    threatScorePoints += 6;
  }

  // Normalize Threat Score between 0 and 100
  const normalizedThreatScore = Math.min(100, Math.max(0, threatScorePoints));

  // Determine Overall Status
  let overallStatus: ThreatSeverity = "SAFE";
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severity === "LOW").length;

  if (criticalCount > 0 || normalizedThreatScore >= 65) {
    overallStatus = "CRITICAL";
  } else if (highCount > 0 || normalizedThreatScore >= 45) {
    overallStatus = "HIGH";
  } else if (mediumCount > 0 || normalizedThreatScore >= 25) {
    overallStatus = "MEDIUM";
  } else if (lowCount > 0 || normalizedThreatScore > 0) {
    overallStatus = "LOW";
  } else {
    overallStatus = "SAFE";
  }

  return {
    tokenId: token.id,
    token,
    threatScore: normalizedThreatScore,
    overallStatus,
    findings,
    vulnerabilityCount: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    },
    isOwnershipRenounced,
    distributionRiskLevel: distributionRisk,
    liquidityLockStatus,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Run heuristic analysis on the entire batch of active tokens
 */
export function runBatchThreatScan(tokens: TokenRecord[]): BatchThreatReport {
  const startTime = performance.now();
  const assessments = tokens.map((t) => analyzeTokenThreats(t));
  const scanDurationMs = Math.round(performance.now() - startTime);

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let safeCount = 0;
  let totalScore = 0;

  const categoryCounts: Record<ThreatCategory, { count: number; maxSev: ThreatSeverity }> = {
    OWNERSHIP_RENOUNCEMENT: { count: 0, maxSev: "SAFE" },
    DISTRIBUTION_PATTERNS: { count: 0, maxSev: "SAFE" },
    LIQUIDITY_LOCK: { count: 0, maxSev: "SAFE" },
    SUPPLY_INFLATION: { count: 0, maxSev: "SAFE" },
    ENTROPY_SIGNATURE: { count: 0, maxSev: "SAFE" },
    AUDIT_COMPLIANCE: { count: 0, maxSev: "SAFE" },
  };

  const vulnNameCounts: Record<
    string,
    { count: number; severity: ThreatSeverity; category: ThreatCategory }
  > = {};

  const sevWeight: Record<ThreatSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    SAFE: 0,
  };

  for (const a of assessments) {
    totalScore += a.threatScore;
    if (a.overallStatus === "CRITICAL") criticalCount++;
    else if (a.overallStatus === "HIGH") highCount++;
    else if (a.overallStatus === "MEDIUM") mediumCount++;
    else if (a.overallStatus === "LOW") lowCount++;
    else safeCount++;

    // Track category findings
    const tokenCategories = new Set<ThreatCategory>();
    for (const f of a.findings) {
      tokenCategories.add(f.category);

      // Track individual vulnerability names
      if (!vulnNameCounts[f.title]) {
        vulnNameCounts[f.title] = { count: 0, severity: f.severity, category: f.category };
      }
      vulnNameCounts[f.title].count++;

      // Track max severity per category
      const currentMax = categoryCounts[f.category].maxSev;
      if (sevWeight[f.severity] > sevWeight[currentMax]) {
        categoryCounts[f.category].maxSev = f.severity;
      }
    }

    for (const cat of tokenCategories) {
      categoryCounts[cat].count++;
    }
  }

  const total = Math.max(1, tokens.length);
  const averageThreatScore = Math.round(totalScore / total);

  // Overall Batch Risk Determination
  let overallBatchRisk: ThreatSeverity = "SAFE";
  if (criticalCount > 0 || averageThreatScore >= 60) {
    overallBatchRisk = "CRITICAL";
  } else if (highCount > 0 || averageThreatScore >= 40) {
    overallBatchRisk = "HIGH";
  } else if (mediumCount > 0 || averageThreatScore >= 20) {
    overallBatchRisk = "MEDIUM";
  } else if (lowCount > 0) {
    overallBatchRisk = "LOW";
  }

  const categoryBreakdown: Record<
    ThreatCategory,
    { affectedCount: number; percentage: number; maxSeverity: ThreatSeverity }
  > = {
    OWNERSHIP_RENOUNCEMENT: {
      affectedCount: categoryCounts.OWNERSHIP_RENOUNCEMENT.count,
      percentage: Math.round((categoryCounts.OWNERSHIP_RENOUNCEMENT.count / total) * 100),
      maxSeverity: categoryCounts.OWNERSHIP_RENOUNCEMENT.maxSev,
    },
    DISTRIBUTION_PATTERNS: {
      affectedCount: categoryCounts.DISTRIBUTION_PATTERNS.count,
      percentage: Math.round((categoryCounts.DISTRIBUTION_PATTERNS.count / total) * 100),
      maxSeverity: categoryCounts.DISTRIBUTION_PATTERNS.maxSev,
    },
    LIQUIDITY_LOCK: {
      affectedCount: categoryCounts.LIQUIDITY_LOCK.count,
      percentage: Math.round((categoryCounts.LIQUIDITY_LOCK.count / total) * 100),
      maxSeverity: categoryCounts.LIQUIDITY_LOCK.maxSev,
    },
    SUPPLY_INFLATION: {
      affectedCount: categoryCounts.SUPPLY_INFLATION.count,
      percentage: Math.round((categoryCounts.SUPPLY_INFLATION.count / total) * 100),
      maxSeverity: categoryCounts.SUPPLY_INFLATION.maxSev,
    },
    ENTROPY_SIGNATURE: {
      affectedCount: categoryCounts.ENTROPY_SIGNATURE.count,
      percentage: Math.round((categoryCounts.ENTROPY_SIGNATURE.count / total) * 100),
      maxSeverity: categoryCounts.ENTROPY_SIGNATURE.maxSev,
    },
    AUDIT_COMPLIANCE: {
      affectedCount: categoryCounts.AUDIT_COMPLIANCE.count,
      percentage: Math.round((categoryCounts.AUDIT_COMPLIANCE.count / total) * 100),
      maxSeverity: categoryCounts.AUDIT_COMPLIANCE.maxSev,
    },
  };

  const topVulnerabilities = Object.entries(vulnNameCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      severity: data.severity,
      category: data.category,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    batchId: `BATCH-SCAN-${Date.now().toString(36).toUpperCase()}`,
    totalTokensScanned: tokens.length,
    overallBatchRisk,
    averageThreatScore,
    criticalTokensCount: criticalCount,
    highRiskTokensCount: highCount,
    mediumRiskTokensCount: mediumCount,
    lowRiskTokensCount: lowCount,
    safeTokensCount: safeCount,
    categoryBreakdown,
    topVulnerabilities,
    assessments,
    scanDurationMs,
    scannedTimestamp: new Date().toISOString(),
  };
}

/**
 * Remediates an individual token by applying safe, un-ruggable defaults:
 * - Renounces ownership to 0x0...dEaD
 * - Sets launch status to 'Rug-Proof Vault'
 * - Locks distribution allocations with 24-month linear vesting
 * - Boosts audit verification & logs mitigation
 */
export function remediateToken(
  token: TokenRecord,
  options?: {
    renounceOwnership?: boolean;
    lockLiquidity?: boolean;
    vestDistribution?: boolean;
    boostAudit?: boolean;
  }
): TokenRecord {
  const opt = {
    renounceOwnership: true,
    lockLiquidity: true,
    vestDistribution: true,
    boostAudit: true,
    ...options,
  };

  const updated: TokenRecord = { ...token };

  // 1. Renounce Ownership
  if (opt.renounceOwnership) {
    updated.targetOwner = "0x000000000000000000000000000000000000dEaD";
  }

  // 2. Lock Liquidity
  if (opt.lockLiquidity) {
    updated.launchStatus = "Rug-Proof Vault";
  }

  // 3. Vest Distribution
  if (opt.vestDistribution && updated.tokenomics?.tokenomics) {
    updated.tokenomics = {
      ...updated.tokenomics,
      tokenomics: updated.tokenomics.tokenomics.map((item) => {
        const cat = item.category.toLowerCase();
        if (
          cat.includes("team") ||
          cat.includes("founder") ||
          cat.includes("insider") ||
          cat.includes("private") ||
          cat.includes("treasury")
        ) {
          return {
            ...item,
            lockup: "24-Month Linear (6m Cliff)",
          };
        }
        return item;
      }),
    };
  }

  // 4. Boost Audit & Security
  if (opt.boostAudit) {
    updated.securityScore = Math.max(98, updated.securityScore || 98);
  }

  // Add remediation tag & note
  const currentTags = updated.tags ? [...updated.tags] : [];
  if (!currentTags.includes("Ownership Renounced")) {
    currentTags.push("Ownership Renounced");
  }
  if (!currentTags.includes("Rug-Proof Vault")) {
    currentTags.push("Rug-Proof Vault");
  }
  if (!currentTags.includes("Vesting Locked")) {
    currentTags.push("Vesting Locked");
  }
  updated.tags = currentTags;

  const timestamp = new Date().toISOString().split("T")[0];
  updated.marketEvolutionNote = `[Security Threat Scanner Remediated ${timestamp}]: Ownership irrevocably renounced to 0x0...dEaD. AMM liquidity locked in Rug-Proof Vault. Insider distribution locked under 24-month linear vesting.`;

  return updated;
}

/**
 * Batch remediates all vulnerable tokens in an array
 */
export function batchRemediateTokens(
  tokens: TokenRecord[],
  targetTokenIds?: string[]
): TokenRecord[] {
  const idFilter = targetTokenIds ? new Set(targetTokenIds) : null;
  return tokens.map((t) => {
    if (idFilter && !idFilter.has(t.id)) {
      return t;
    }
    // Only remediate if has at least one risk
    const assessment = analyzeTokenThreats(t);
    if (assessment.overallStatus === "SAFE") {
      return t;
    }
    return remediateToken(t);
  });
}

/**
 * Exports Threat Report to CSV string
 */
export function exportThreatReportToCsv(report: BatchThreatReport): string {
  const headers = [
    "Token ID",
    "Name",
    "Symbol",
    "Chain",
    "Contract Address",
    "Threat Level",
    "Threat Score",
    "Ownership Renounced",
    "Distribution Risk",
    "Liquidity Status",
    "Critical Findings",
    "High Findings",
    "Medium Findings",
    "Top Finding Rule",
    "Top Finding Remediation",
  ];

  const rows = report.assessments.map((a) => {
    const topFinding = a.findings[0];
    return [
      `"${a.token.id}"`,
      `"${a.token.name}"`,
      `"${a.token.symbol}"`,
      `"${a.token.chain}"`,
      `"${a.token.contractAddress}"`,
      `"${a.overallStatus}"`,
      a.threatScore,
      a.isOwnershipRenounced ? "YES (Renounced)" : "NO (At Risk)",
      `"${a.distributionRiskLevel}"`,
      `"${a.liquidityLockStatus}"`,
      a.vulnerabilityCount.critical,
      a.vulnerabilityCount.high,
      a.vulnerabilityCount.medium,
      `"${topFinding?.heuristicRule || "None"}"`,
      `"${topFinding?.remediation?.replace(/"/g, '""') || "N/A"}"`,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
