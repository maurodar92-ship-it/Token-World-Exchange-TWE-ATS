export type PillarStatus = "yellow" | "orange" | "green" | "red";

export interface Tree3Pillar {
  title: string;
  status: PillarStatus;
  statusBadge: string; // e.g. "🟡 Foundation Created", "🟠 Action Required"
  summary: string;
  details: string[];
  recommendations?: string[];
  metrics?: Record<string, string | number>;
}

export interface WeeklyTree3Update {
  id: string;
  editionNumber: number;
  title: string;
  date: string;
  timestamp: number;
  cadence: string; // "Runs Every Monday"
  overallStatus: string; // "Prototype → testnet preparation"
  nextMilestone: string; // "Clean, reproducible testnet deployment followed by expanded security/testing coverage"
  nextScheduledDate: string; // "Monday, October 12, 2026"
  nextScheduledTimestamp: number;
  author: string;
  authorRole: string;

  pillars: {
    blockchain: Tree3Pillar;
    tokenomics: Tree3Pillar;
    testing: Tree3Pillar;
    security: Tree3Pillar;
    dataIntegration: Tree3Pillar;
  };

  risksAndBlockers: {
    risk: string;
    severity: "low" | "medium" | "high" | "critical";
    mitigation: string;
    owner: string;
  }[];

  confirmedVsProposals: {
    item: string;
    category: "Confirmed Specification" | "Proposal / Reference Target";
    status: "Active" | "Pending Audit" | "Target Reference Only";
    notes: string;
  }[];

  rawNotes?: string;
}

export interface TestResultItem {
  name: string;
  description: string;
  status: "PASSED" | "FAILED" | "PENDING";
  gasUsed: number;
  executionTimeMs: number;
  details: string;
}

export interface SanitizerResult {
  validCount: number;
  rejectedCount: number;
  totalProcessed: number;
  validRecords: { address: string; amount: number }[];
  rejectedRecords: { row: number; raw: any; reason: string }[];
  sanitizedAt: number;
}
