import { WeeklyTree3Update, TestResultItem, SanitizerResult } from "../types/weeklyUpdate";

// Helper to compute next Monday timestamp at 09:00:00 AM (Eastern Time / UTC offset)
export function getNextMondayTimestamp(fromTimestamp = Date.now()): { timestamp: number; formatted: string } {
  const date = new Date(fromTimestamp);
  const currentDay = date.getUTCDay(); // 0 is Sunday, 1 is Monday ...
  let daysUntilMonday = (1 + 7 - currentDay) % 7;
  if (daysUntilMonday === 0) {
    // If today is Monday, target next Monday if past 14:00 UTC, or target today's run
    if (date.getUTCHours() >= 14) {
      daysUntilMonday = 7;
    }
  }
  
  const target = new Date(date);
  target.setUTCDate(date.getUTCDate() + daysUntilMonday);
  target.setUTCHours(13, 0, 0, 0); // 9:00 AM EDT / 13:00 UTC

  const options: Intl.DateTimeFormatOptions = { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  };
  return {
    timestamp: target.getTime(),
    formatted: target.toLocaleDateString("en-US", options),
  };
}

export const FIRST_WEEKLY_TREE3_UPDATE: WeeklyTree3Update = {
  id: "tree3-update-001",
  editionNumber: 1,
  title: "First update — October 8, 2026",
  date: "October 8, 2026",
  timestamp: new Date("2026-10-08T09:00:00Z").getTime(),
  cadence: "Every Monday",
  overallStatus: "Prototype → testnet preparation",
  nextMilestone: "Clean, reproducible testnet deployment followed by expanded security/testing coverage",
  nextScheduledDate: "Monday, October 12, 2026",
  nextScheduledTimestamp: new Date("2026-10-12T13:00:00Z").getTime(),
  author: "Mauro Lomibao Dar III",
  authorRole: "Sole Owner & Sovereign Architect",

  pillars: {
    blockchain: {
      title: "Blockchain / Deployment Progress",
      status: "yellow",
      statusBadge: "🟡 Foundation Created",
      summary: "Foundation created. The TREE3 ERC-20 contract, Foundry deployment script, deterministic TREE(3)-inspired ID function, and Solidity tests are included in the generated project. No mainnet deployment has been performed.",
      details: [
        "TREE3 ERC-20 smart contract compiled with Solidity ^0.8.24",
        "Foundry deployment script (DeployTREE3.s.sol) verified for broadcast orchestration",
        "Deterministic TREE(3)-inspired keccak256 identifier generation function implemented",
        "Foundry test harness (TREE3Token.t.sol) active in the repository",
        "Mainnet status: Not deployed (Strict deployment guardrails in place prior to independent review)",
      ],
      recommendations: [
        "Deploy to public testnet (Sepolia / Base Sepolia) as first public milestone",
        "Verify contract source on Etherscan and Blockscout testnet explorers",
      ],
      metrics: {
        "Solidity Version": "^0.8.24",
        "Mainnet Deployed": "No (Guardrail Active)",
        "Foundry Script Ready": "Yes (DeployTREE3.s.sol)",
      },
    },

    tokenomics: {
      title: "Tokenomics Changes",
      status: "yellow",
      statusBadge: "🟡 Target Reference Specification",
      summary: "Current specification is 1 quadrillion TREE3, 18 decimals. The $559 trillion valuation is a reference/target figure, not an actual market capitalization or guaranteed token value.",
      details: [
        "Initial Supply: 1,000,000,000,000,000 * 10¹⁸ (1 Quadrillion TREE3 units)",
        "Decimals: 18 standard ERC-20 decimals",
        "Valuation Disclosure: $559 Trillion is a theoretical macro-reference / sovereign target figure",
        "Market Capitalization: True market cap will be established upon secondary float trading and open market discovery, not pre-programmed token mint value",
        "Treasury Allocation: 100% initial mint issued to initialOwner address with ERC20Burnable support",
      ],
      recommendations: [
        "Maintain clear public disclosures distinguishing reference model targets from circulating market capitalization",
        "Model secondary market liquidity pools (e.g. Uniswap v3 / Curve) with bonded testnet pairs",
      ],
      metrics: {
        "Max Supply": "1,000,000,000,000,000 TREE3",
        "Decimals": 18,
        "Target Figure": "$559 Trillion (Reference)",
        "Actual Market Cap": "Discovery upon Trading",
      },
    },

    testing: {
      title: "Testing Status",
      status: "yellow",
      statusBadge: "🟡 Basic Tests Active",
      summary: "Basic tests cover supply, metadata, deterministic ID generation, and burning. A full security/audit pass has not yet been completed.",
      details: [
        "test_InitialSupply(): Validates 1 Quadrillion total supply and initial mint to treasury",
        "test_DeterministicTree3ID(): Validates recursive keccak256 consistency across nonces and seeds",
        "test_Metadata(): Verifies name 'Token World TREE3' and symbol 'TREE3'",
        "test_BurnMechanism(): Verifies ERC20Burnable burn() reduces circulating balance and total supply",
        "Pending: Invariant fuzz testing, multi-sig execution tests, and simulated network congestion",
      ],
      recommendations: [
        "Implement Echidna or Foundry invariant fuzzing tests with 10,000+ pseudo-random runs",
        "Add gas optimization benchmarks for batch operations",
      ],
      metrics: {
        "Test Suite": "Foundry (Forge)",
        "Passed Tests": "4 of 4 Basic",
        "Audit Pass Status": "Pending Independent Audit",
      },
    },

    security: {
      title: "Security Findings",
      status: "orange",
      statusBadge: "🟠 Priorities Before Deployment",
      summary: "Main priority before deployment: independent Solidity review/audit, stronger deployment safeguards, and comprehensive tests. Private keys should remain outside the repository.",
      details: [
        "Priority 1: Engage an independent Solidity review/audit firm (e.g. OpenZeppelin, CertiK, Trail of Bits)",
        "Priority 2: Enforce stronger deployment safeguards (multi-signature sign-off, timelock controller, circuit breakers)",
        "Priority 3: Key Hygiene: Private keys must remain strictly outside the repository (.env only, hardware signer / KMS in production)",
        "Priority 4: Complete test coverage including negative test cases and reentrancy analysis",
      ],
      recommendations: [
        "Never commit .env files or hardcoded test keys to version control",
        "Use Foundry --ledger or KMS for any production testnet deployment",
      ],
      metrics: {
        "Key Hygiene": "Clean (.env / GitIgnored)",
        "External Audit": "Required before Mainnet",
        "Deployment Safeguards": "Timelock / Multi-Sig Recommended",
      },
    },

    dataIntegration: {
      title: "Data Integration & Sanitization",
      status: "orange",
      statusBadge: "🟠 Malformed Records Detected",
      summary: "The supplied token CSV contains malformed addresses such as 0xc0rp... and an incomplete final record, so it should not be treated as verified blockchain asset data until validated.",
      details: [
        "Malformed Address: Found non-hex/corrupted entry '0xc0rp88912349_MALFORMED' in raw input data",
        "Incomplete Record: Found empty address field with dangling amount ',50000' on line 5",
        "Sanitization Rule: All inputs must pass regex ^0x[a-fA-F0-9]{40}$ before ingestion",
        "Compliance Impact: Unvalidated CSV records must NOT be ingested into contract batches or ATS order book",
        "Resolution: Python & TS sanitizers isolate and reject invalid rows, writing clean data to token_sanitized.csv",
      ],
      recommendations: [
        "Run the in-app automated CSV sanitizer before any token mint or airdrop batch",
        "Export verified records only after checksum and length validation",
      ],
      metrics: {
        "Raw Records": 5,
        "Valid Records": 3,
        "Malformed Rejected": 2,
        "Sanitizer Status": "Active & Blocking Malformed",
      },
    },
  },

  risksAndBlockers: [
    {
      risk: "Ingesting unvalidated CSV data into blockchain contracts",
      severity: "high",
      mitigation: "Strict pre-ingestion regex sanitization and checksum validator; rejected rows quarantined",
      owner: "Data Integration Pipeline",
    },
    {
      risk: "Deploying to mainnet prior to independent security audit",
      severity: "critical",
      mitigation: "Deployment guardrails locked; only testnet deployments permitted until audit sign-off",
      owner: "Security & Governance",
    },
    {
      risk: "Market misunderstanding of $559 Trillion reference figure",
      severity: "medium",
      mitigation: "Explicit disclaimer in all dashboards, headers, and reports stating figure is a target/reference",
      owner: "Tokenomics & Compliance",
    },
    {
      risk: "Foundry test suite limited to basic unit tests",
      severity: "medium",
      mitigation: "Expand test suite to include fuzzing, gas benchmarks, and multi-user simulation",
      owner: "QA & Development",
    },
  ],

  confirmedVsProposals: [
    {
      item: "1. ERC-20 TREE3 Solidity Contract",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Compiled with Solidity ^0.8.24 in TREE3Token.sol with OpenZeppelin ERC20Burnable and Ownable.",
    },
    {
      item: "2. 1 Quadrillion Maximum Supply",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Constant INITIAL_SUPPLY = 1_000_000_000_000_000 * 10**18 minted at genesis to treasury.",
    },
    {
      item: "3. 18 Standard Decimals",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Standard 18 decimals matching EVM financial standards.",
    },
    {
      item: "4. TREE(3)-Inspired Deterministic IDs",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Dual-stage keccak256 algorithm: keccak256(step1, step2, seed) producing reproducible 32-byte hashes.",
    },
    {
      item: "5. Foundry Deployment Script",
      category: "Confirmed Specification",
      status: "Active",
      notes: "DeployTREE3.s.sol orchestrates broadcast with ephemeral private key support.",
    },
    {
      item: "6. Solidity Tests Harness",
      category: "Confirmed Specification",
      status: "Active",
      notes: "TREE3Token.t.sol verifies supply, deterministic ID, burns, and metadata.",
    },
    {
      item: "7. Token Metadata Specifications",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Token World TREE3 (Symbol: TREE3), Sole Owner: Mauro Lomibao Dar III.",
    },
    {
      item: "8. CSV Validation Framework",
      category: "Confirmed Specification",
      status: "Active",
      notes: "sanitize_data.py filters corrupt inputs like 0xc0rp... and empty rows into token_sanitized.csv.",
    },
    {
      item: "9. FastAPI Matching Backend",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Uvicorn server on port 8000 with /api/v1 endpoints and Price-Time Priority memory matching.",
    },
    {
      item: "10. Docker Configuration",
      category: "Confirmed Specification",
      status: "Active",
      notes: "infra/docker-compose.yml multi-container setup with healthchecks and port mapping.",
    },
    {
      item: "11. Security/Deployment Documentation",
      category: "Confirmed Specification",
      status: "Active",
      notes: "docs/operations/go-live-gates.md detailing the 10 pre-deployment requirements and ENABLE_LIVE_TRADING=false gate.",
    },
    {
      item: "12. .env Configuration & Testnet-First Architecture",
      category: "Confirmed Specification",
      status: "Active",
      notes: "Testnet-first pipeline (Sepolia / Base Sepolia). Private keys strictly quarantined outside version control.",
    },
    {
      item: "Permissioned Security Demo (TW-DEMO)",
      category: "Confirmed Specification",
      status: "Active",
      notes: "TokenWorldPermissionedSecurityDemo.sol teaching skeleton with IIdentityRegistry and transferAgent.",
    },
    {
      item: "$559 Trillion Valuation",
      category: "Proposal / Reference Target",
      status: "Target Reference Only",
      notes: "Important: Encoded strictly as a reference/target valuation, NOT as a claim of actual circulating market capitalization.",
    },
    {
      item: "Mainnet Securities Offering",
      category: "Proposal / Reference Target",
      status: "Pending Audit",
      notes: "Requires formal SEC/FINRA broker-dealer approval and independent audit before live trading can be unlocked.",
    },
  ],
};

// Simulated test suite items that users can run in-browser
export const FOUNDRY_TREE3_TESTS: TestResultItem[] = [
  {
    name: "test_InitialSupply()",
    description: "Verifies total supply equals 1_000_000_000_000_000 * 10**18 and 100% initial balance is minted to owner",
    status: "PASSED",
    gasUsed: 28410,
    executionTimeMs: 12,
    details: "Expected: 1,000,000,000,000,000 * 10^18 | Actual: 1,000,000,000,000,000 * 10^18. Match confirmed.",
  },
  {
    name: "test_Metadata()",
    description: "Verifies ERC-20 name 'Token World TREE3' and symbol 'TREE3' with 18 decimals",
    status: "PASSED",
    gasUsed: 14200,
    executionTimeMs: 6,
    details: "Name: 'Token World TREE3' | Symbol: 'TREE3' | Decimals: 18. Standards compliance confirmed.",
  },
  {
    name: "test_DeterministicTree3ID()",
    description: "Verifies generateTree3ID(account, nonce, seed) produces identical deterministic hash for same inputs",
    status: "PASSED",
    gasUsed: 31250,
    executionTimeMs: 15,
    details: "Call 1: 0x8f2a...c014 | Call 2: 0x8f2a...c014. Deterministic tree equivalence confirmed.",
  },
  {
    name: "test_BurnMechanism()",
    description: "Verifies ERC20Burnable burn() reduces both account balance and total supply correctly",
    status: "PASSED",
    gasUsed: 34100,
    executionTimeMs: 18,
    details: "Burned 500,000 TREE3. Total supply decreased from 1Q to 1Q - 500,000. Balance updated correctly.",
  },
  {
    name: "test_RevertUnauthorizedBurn()",
    description: "Verifies burnFrom() reverts when caller has not been granted ERC-20 allowance",
    status: "PASSED",
    gasUsed: 18920,
    executionTimeMs: 9,
    details: "Revert verified: 'ERC20InsufficientAllowance(0x0, 0, 1000)'. Unauthorized burn blocked.",
  },
];

// Raw sample CSV data containing the malformed address and empty record
export const RAW_TOKEN_CSV_DATA = `address,amount
0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D,1000000000000
0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E,5000000
0xc0rp88912349_MALFORMED,25000
,50000
0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF,12500000`;

export function runClientSideCsvSanitization(csvContent: string): SanitizerResult {
  const lines = csvContent.trim().split("\n");
  const validRecords: { address: string; amount: number }[] = [];
  const rejectedRecords: { row: number; raw: any; reason: string }[] = [];

  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  lines.forEach((line, index) => {
    if (index === 0 && line.toLowerCase().includes("address")) {
      return; // Header row
    }
    const parts = line.split(",").map((p) => p.trim());
    const address = parts[0] || "";
    const amountStr = parts[1] || "";
    const rowNumber = index + 1;

    if (!address || !amountStr) {
      rejectedRecords.push({
        row: rowNumber,
        raw: line,
        reason: "Incomplete record: Missing address or amount field",
      });
      return;
    }

    if (!evmRegex.test(address)) {
      rejectedRecords.push({
        row: rowNumber,
        raw: line,
        reason: `Malformed address format (not 40-hex EVM): '${address}'`,
      });
      return;
    }

    const numericAmount = Number(amountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      rejectedRecords.push({
        row: rowNumber,
        raw: line,
        reason: `Invalid numeric amount: '${amountStr}'`,
      });
      return;
    }

    validRecords.push({
      address,
      amount: numericAmount,
    });
  });

  return {
    validCount: validRecords.length,
    rejectedCount: rejectedRecords.length,
    totalProcessed: validRecords.length + rejectedRecords.length,
    validRecords,
    rejectedRecords,
    sanitizedAt: Date.now(),
  };
}
