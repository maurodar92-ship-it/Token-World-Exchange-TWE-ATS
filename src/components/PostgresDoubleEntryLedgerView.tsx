import React, { useState } from "react";
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Check,
  Copy,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  DollarSign,
  ArrowRight,
  Info,
  Layers,
  Scale,
  Lock,
  Unlock,
  Zap,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import {
  POSTGRES_DOUBLE_ENTRY_SCHEMA_SQL,
  INITIAL_LEDGER_ACCOUNTS,
  INITIAL_JOURNAL_ENTRIES,
  LedgerAccount,
  JournalEntry,
  LedgerLine,
} from "../utils/doubleEntryLedgerAndGethTracerEngine";

interface MultiWorkerResult {
  workerId: number;
  workerName: string;
  status: "ACQUIRED_COMMIT" | "BLOCKED_ROLLBACK" | "UNSAFE_DOUBLE_SPENT";
  amount: number;
  lockWaitMs: number;
  balanceBefore: number;
  balanceAfter: number;
  message: string;
}

export const PostgresDoubleEntryLedgerView: React.FC = () => {
  const [accounts, setAccounts] = useState<LedgerAccount[]>(INITIAL_LEDGER_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(
    INITIAL_JOURNAL_ENTRIES.map((entry) => ({
      ...entry,
      safeSettlementLocked: true,
      sqlTrace: `-- Seeding transaction ${entry.id}\nBEGIN;\nSELECT * FROM accounts WHERE id IN ('${Array.from(new Set(entry.lines.map((l) => l.accountId))).sort().join("', '")}') ORDER BY id FOR UPDATE;\nINSERT INTO journal_entries (id, description) VALUES ('${entry.id}', '${entry.description}');\nCOMMIT;`,
    }))
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Transaction Form State
  const [txDescription, setTxDescription] = useState<string>("Cross-DEX Arbitrage Settlement via Flashbots");
  const [txLines, setTxLines] = useState<Array<{ accountId: string; amount: number }>>([
    { accountId: "acc-1010", amount: 25000 }, // Cash +$25k (debit)
    { accountId: "acc-4010", amount: -30000 }, // Revenue -$30k (credit)
    { accountId: "acc-5010", amount: 5000 }, // Gas Expense +$5k (debit)
  ]);

  // Safe Settlement (SELECT FOR UPDATE) Pessimistic Row-Level Locking Toggle
  const [safeSettlementEnabled, setSafeSettlementEnabled] = useState<boolean>(true);
  const [activeLockedAccounts, setActiveLockedAccounts] = useState<string[]>([]);
  const [simulatedDoubleSpendAttempt, setSimulatedDoubleSpendAttempt] = useState<boolean>(false);
  const [isSimulatingRace, setIsSimulatingRace] = useState<boolean>(false);
  const [multiWorkerResults, setMultiWorkerResults] = useState<MultiWorkerResult[] | null>(null);

  // Journal Search & Expansion
  const [journalSearch, setJournalSearch] = useState<string>("");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const [lastExecutionResult, setLastExecutionResult] = useState<{
    status: "SUCCESS" | "ERROR" | "BLOCKED" | "DOUBLE_SPEND_ANOMALY";
    message: string;
    details?: string;
    sqlTrace?: string;
    lockedAccounts?: string[];
    timestamp: string;
  } | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Compute current line sum
  const currentLinesSum = txLines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);

  // Add line
  const handleAddLine = () => {
    setTxLines([...txLines, { accountId: accounts[0].id, amount: 0 }]);
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    if (txLines.length <= 2) return;
    setTxLines(txLines.filter((_, i) => i !== index));
  };

  // Update line
  const handleUpdateLine = (index: number, field: "accountId" | "amount", value: any) => {
    const updated = [...txLines];
    updated[index] = { ...updated[index], [field]: value };
    setTxLines(updated);
  };

  // Reset ledger to genesis state
  const handleResetLedger = () => {
    setAccounts(INITIAL_LEDGER_ACCOUNTS);
    setJournalEntries(
      INITIAL_JOURNAL_ENTRIES.map((entry) => ({
        ...entry,
        safeSettlementLocked: true,
      }))
    );
    setLastExecutionResult(null);
    setMultiWorkerResults(null);
    setActiveLockedAccounts([]);
    setSimulatedDoubleSpendAttempt(false);
  };

  // Preload test scenarios
  const handleLoadBalancedScenario = () => {
    setTxDescription("Balanced MEV Arbitrage Execution (Sum = 0)");
    setTxLines([
      { accountId: "acc-1010", amount: 75000 }, // Debit Operating Cash +$75k
      { accountId: "acc-4010", amount: -90000 }, // Credit Revenue -$90k
      { accountId: "acc-5010", amount: 15000 }, // Debit Builder Bribe +$15k
    ]);
    setSimulatedDoubleSpendAttempt(false);
    setLastExecutionResult(null);
  };

  const handleLoadUnbalancedScenario = () => {
    setTxDescription("Defective Flash-Loan Settlement with Slippage Drift (Unbalanced Trigger Test)");
    setTxLines([
      { accountId: "acc-1010", amount: 50000 }, // Debit Cash +$50k
      { accountId: "acc-4010", amount: -40000 }, // Credit Revenue -$40k (leaves +$10k imbalance)
    ]);
    setSimulatedDoubleSpendAttempt(false);
    setLastExecutionResult(null);
  };

  const handleArmDoubleSpendAttack = () => {
    const cashAcc = accounts.find((a) => a.id === "acc-1010") || accounts[0];
    const available = cashAcc.balance;
    const attackAmount = Math.max(10000, Math.floor(available * 0.8));

    setTxDescription(`Race Condition: Double-Spend Withdrawal against ${cashAcc.name}`);
    setTxLines([
      { accountId: cashAcc.id, amount: -attackAmount }, // Credit (Withdraw) $attackAmount
      { accountId: "acc-2010", amount: attackAmount }, // Debit Client Vault
    ]);
    setSimulatedDoubleSpendAttempt(true);
    setLastExecutionResult(null);
  };

  // Simulate SQL Transaction Commit with Postgres Trigger & Safe Settlement Lock
  const handleSimulateCommit = () => {
    const entryId = "entry-" + Math.random().toString(36).substring(2, 9);
    const balance = currentLinesSum;
    const involvedAccountIds = Array.from(new Set(txLines.map((l) => l.accountId))).sort();

    // 1. Simulate SELECT ... FOR UPDATE row-level lock & Double-Spending Prevention
    if (safeSettlementEnabled) {
      setActiveLockedAccounts(involvedAccountIds);
      setTimeout(() => setActiveLockedAccounts([]), 1800);

      // Find accounts being credited (money leaving)
      const debitedOutAccounts = txLines.filter((l) => Number(l.amount) < 0);

      // Check if any source account would suffer a negative balance or race condition
      for (const line of debitedOutAccounts) {
        const acc = accounts.find((a) => a.id === line.accountId);
        const requiredAmount = Math.abs(Number(line.amount));

        // If trying to simulate a concurrent double-spend attack or overdraft under lock
        if (simulatedDoubleSpendAttempt || (acc && acc.type === "asset" && acc.balance < requiredAmount)) {
          setLastExecutionResult({
            status: "BLOCKED",
            message: `DOUBLE-SPEND DETECTED & BLOCKED: SELECT FOR UPDATE acquired exclusive lock on accounts [${involvedAccountIds.join(", ")}].`,
            details: `Safe Settlement Lock prevented race condition / double-spending on account '${acc?.name || line.accountId}'. Current locked balance ($${(acc?.balance || 0).toLocaleString()}) is insufficient for requested withdrawal -$${requiredAmount.toLocaleString()}. Transaction rolled back safely before commit. Zero state mutated.`,
            sqlTrace: `-- 1. Begin atomic transaction block\nBEGIN;\n\n-- 2. Sort & Acquire Exclusive Row-Level Lock (SELECT FOR UPDATE)\n-- Deterministic ID sorting eliminates deadlocks across concurrent searchers\nSELECT id, name, balance \nFROM accounts \nWHERE id IN ('${involvedAccountIds.join("', '")}') \nORDER BY id FOR UPDATE;\n\n-- 3. Verify available balance under exclusive row lock\n-- Balance check failed: Available ($${(acc?.balance || 0).toLocaleString()}) < Requested ($${requiredAmount.toLocaleString()})\nRAISE EXCEPTION 'Double-Spend Prevented: Account % has insufficient funds for withdrawal', '${acc?.id}';\n\n-- 4. Abort transaction cleanly\nROLLBACK; -- Double-spend prevented, zero state mutated!`,
            lockedAccounts: involvedAccountIds,
            timestamp: new Date().toLocaleTimeString(),
          });
          return;
        }
      }
    } else {
      // Without Safe Settlement, if double-spend is simulated, race condition slips through or overdraft occurs
      if (simulatedDoubleSpendAttempt) {
        const targetAcc = accounts.find((a) => a.id === txLines[0].accountId) || accounts[0];
        setLastExecutionResult({
          status: "DOUBLE_SPEND_ANOMALY",
          message: `CRITICAL DOUBLE-SPEND DRIFT! Safe Settlement (SELECT FOR UPDATE) was DISABLED.`,
          details: `Concurrent transaction executed without pessimistic row-level lock. Two competing searchers read stale balance simultaneously, bypassing serialization. Both withdrawals committed, creating -$${Math.abs(txLines[0].amount).toLocaleString()} phantom balance drift. Enable 'Safe Settlement' to enforce ACID isolation!`,
          sqlTrace: `-- UNSAFE CONCURRENT READ (NO PESSIMISTIC LOCK):\nBEGIN;\n-- Shared read lock only:\nSELECT balance FROM accounts WHERE id = '${targetAcc.id}'; -- Reads stale cached balance $${targetAcc.balance.toLocaleString()}\n-- Competing transaction executed concurrently on same account!\nINSERT INTO journal_entries (id, description) VALUES ('${entryId}', 'UNSAFE_CONCURRENT_RACE');\nINSERT INTO ledger_lines ...;\nCOMMIT; -- CATASTROPHIC DOUBLE-SPEND DRIFT COMMITTED!`,
          lockedAccounts: [],
          timestamp: new Date().toLocaleTimeString(),
        });

        // Mutate account into negative drift to visualize the damage
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === targetAcc.id ? { ...a, balance: a.balance + Number(txLines[0].amount) * 2 } : a
          )
        );
        return;
      }
    }

    // 2. Simulate verify_journal_entry_balance() function
    if (balance !== 0) {
      setLastExecutionResult({
        status: "ERROR",
        message: `ERROR: Unbalanced journal entry ${entryId}: net balance is ${balance > 0 ? "+" : ""}${balance.toFixed(4)} (must be 0)`,
        details: `PostgreSQL Constraint Trigger 'check_journal_balance' ABORTED the transaction at COMMIT. The ledger lines sum to ${balance > 0 ? "+" : ""}${balance.toFixed(4)}, violating double-entry accounting equilibrium. Zero state mutated.`,
        sqlTrace: `BEGIN;\nINSERT INTO journal_entries (id, description) VALUES ('${entryId}', '${txDescription}');\nINSERT INTO ledger_lines (entry_id, account_id, amount) VALUES ...;\n\n-- Deferred trigger evaluation at COMMIT:\nSELECT SUM(amount) FROM ledger_lines WHERE entry_id = '${entryId}'; -- Result: ${balance}\nRAISE EXCEPTION 'Unbalanced journal entry %: net balance is % (must be 0)', '${entryId}', ${balance};\nROLLBACK; -- Zero balance drift guaranteed by constraint trigger!`,
        lockedAccounts: [],
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    // 3. Success: Commit atomically with SELECT FOR UPDATE guarantees
    const formattedLines: LedgerLine[] = txLines.map((l, i) => {
      const acc = accounts.find((a) => a.id === l.accountId);
      return {
        id: `line-${Date.now()}-${i}`,
        accountId: l.accountId,
        accountName: acc?.name || l.accountId,
        amount: Number(l.amount),
      };
    });

    // Update account balances
    const updatedAccounts = accounts.map((acc) => {
      const delta = txLines
        .filter((l) => l.accountId === acc.id)
        .reduce((sum, l) => sum + Number(l.amount), 0);
      return {
        ...acc,
        balance: acc.balance + delta,
      };
    });

    const successSqlTrace = safeSettlementEnabled
      ? `BEGIN;\n-- 1. Acquire exclusive pessimistic row locks in deterministic ID order:\nSELECT id, name, balance FROM accounts WHERE id IN ('${involvedAccountIds.join("', '")}') ORDER BY id FOR UPDATE;\n\n-- 2. Insert Journal Entry Header:\nINSERT INTO journal_entries (id, description) VALUES ('${entryId}', '${txDescription}');\n\n-- 3. Insert Balanced Ledger Lines:\n${formattedLines.map((l) => `INSERT INTO ledger_lines (entry_id, account_id, amount) VALUES ('${entryId}', '${l.accountId}', ${l.amount});`).join("\n")}\n\n-- 4. Constraint Trigger 'check_journal_balance' verifies equilibrium:\n-- DEFERRABLE INITIALLY DEFERRED: SUM(amount) = 0.0000 -> OK\nCOMMIT; -- Atomically persisted with Zero Double-Spending Risk!`
      : `BEGIN;\n-- UNSAFE READ (NO ROW-LEVEL LOCK ACQUIRED):\nINSERT INTO journal_entries (id, description) VALUES ('${entryId}', '${txDescription}');\nINSERT INTO ledger_lines ...;\nCOMMIT; -- (Warning: Safe Settlement was disabled)`;

    const newEntry: JournalEntry = {
      id: entryId,
      description: txDescription,
      postedAt: new Date().toISOString(),
      lines: formattedLines,
      netBalance: 0,
      status: "POSTED",
      safeSettlementLocked: safeSettlementEnabled,
      sqlTrace: successSqlTrace,
    };

    setAccounts(updatedAccounts);
    setJournalEntries([newEntry, ...journalEntries]);
    setLastExecutionResult({
      status: "SUCCESS",
      message: `COMMIT SUCCESSFUL: Journal entry ${entryId} persisted atomically.`,
      details: safeSettlementEnabled
        ? `Row-level locks (SELECT FOR UPDATE) serialized account mutations across [${involvedAccountIds.join(", ")}]. Constraint trigger verified SUM(amount) === 0 across ${txLines.length} lines. Zero double-spending risk.`
        : `Transaction committed across ${txLines.length} lines without row locks. (Warning: Safe Settlement locking was inactive).`,
      sqlTrace: successSqlTrace,
      lockedAccounts: safeSettlementEnabled ? involvedAccountIds : [],
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Run Concurrent 5-Worker Race Condition Stress Test
  const handleRunMultiWorkerRace = () => {
    setIsSimulatingRace(true);
    const cashAcc = accounts.find((a) => a.id === "acc-1010") || accounts[0];
    const initialCash = cashAcc.balance;
    const workerWithdrawal = 150000; // Each worker requests $150k

    setTimeout(() => {
      let currentRunningBalance = initialCash;
      const results: MultiWorkerResult[] = [];

      for (let i = 1; i <= 5; i++) {
        const lockWaitMs = Math.floor(Math.random() * 12) + i * 4;
        const balanceBefore = currentRunningBalance;

        if (safeSettlementEnabled) {
          // With SELECT FOR UPDATE: workers acquire exclusive lock sequentially
          if (currentRunningBalance >= workerWithdrawal) {
            currentRunningBalance -= workerWithdrawal;
            results.push({
              workerId: i,
              workerName: `MEV Searcher Worker #${i}`,
              status: "ACQUIRED_COMMIT",
              amount: workerWithdrawal,
              lockWaitMs,
              balanceBefore,
              balanceAfter: currentRunningBalance,
              message: `SELECT FOR UPDATE lock acquired (+${lockWaitMs}ms). Balance $${balanceBefore.toLocaleString()} >= $${workerWithdrawal.toLocaleString()}. COMMITTED.`,
            });
          } else {
            results.push({
              workerId: i,
              workerName: `MEV Searcher Worker #${i}`,
              status: "BLOCKED_ROLLBACK",
              amount: workerWithdrawal,
              lockWaitMs,
              balanceBefore,
              balanceAfter: currentRunningBalance,
              message: `SELECT FOR UPDATE serialized read: Insufficient balance ($${balanceBefore.toLocaleString()} < $${workerWithdrawal.toLocaleString()}). ROLLBACK EXECUTED (Double-Spend Prevented).`,
            });
          }
        } else {
          // Without SELECT FOR UPDATE: concurrent workers read initialCash simultaneously
          currentRunningBalance -= workerWithdrawal;
          results.push({
            workerId: i,
            workerName: `Unsafe Searcher #${i}`,
            status: "UNSAFE_DOUBLE_SPENT",
            amount: workerWithdrawal,
            lockWaitMs: 1,
            balanceBefore: initialCash,
            balanceAfter: currentRunningBalance,
            message: `Unsafe Read: Concurrently read stale balance ($${initialCash.toLocaleString()}) without lock. Double-spent $${workerWithdrawal.toLocaleString()}!`,
          });
        }
      }

      setMultiWorkerResults(results);
      setIsSimulatingRace(false);

      // If unsafe, update the account balance to reflect the overdraft
      if (!safeSettlementEnabled) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === cashAcc.id ? { ...a, balance: currentRunningBalance } : a
          )
        );
      } else {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === cashAcc.id ? { ...a, balance: currentRunningBalance } : a
          )
        );
      }
    }, 600);
  };

  // Calculate Trial Balance
  const totalDebits = accounts
    .filter((a) => a.balance > 0)
    .reduce((sum, a) => sum + a.balance, 0);
  const totalCredits = accounts
    .filter((a) => a.balance < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const trialBalanceDiff = Math.abs(totalDebits - totalCredits);

  // Filtered Journal Entries
  const filteredJournalEntries = journalEntries.filter((entry) => {
    if (!journalSearch.trim()) return true;
    const query = journalSearch.toLowerCase();
    return (
      entry.id.toLowerCase().includes(query) ||
      entry.description.toLowerCase().includes(query) ||
      entry.lines.some((l) => l.accountName.toLowerCase().includes(query))
    );
  });

  // Export Journal to JSON
  const handleExportJournalJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(journalEntries, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `postgres_ledger_journal_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  PostgreSQL Double-Entry Ledger Studio
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ACID & SELECT FOR UPDATE Locking
                  </span>
                  {safeSettlementEnabled ? (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Safe Settlement ON
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Safe Settlement OFF
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400">
                  Schema-enforced double-entry financial ledger with <code className="text-emerald-300 font-mono">SELECT ... FOR UPDATE</code> pessimistic row locking to prevent double-spending and <code className="text-emerald-300 font-mono">DEFERRABLE INITIALLY DEFERRED</code> triggers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetLedger}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-gray-300 hover:text-white border border-[#2B2B33] text-xs font-mono transition cursor-pointer"
              title="Reset accounts and journal entries to default genesis state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              Reset Genesis
            </button>
            <button
              onClick={() => handleCopy(POSTGRES_DOUBLE_ENTRY_SCHEMA_SQL, "sql_schema")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] text-xs font-mono transition cursor-pointer"
            >
              {copiedKey === "sql_schema" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              Copy SQL Schema
            </button>
          </div>
        </div>

        {/* 3 Core Architecture Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#23232A]">
          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl space-y-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              1. Signed Single-Column
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Positive values represent <strong>Debits</strong>, negative values represent <strong>Credits</strong>. Eliminates duplicate columns and enforces equilibrium with <code className="text-emerald-300">SUM(amount) = 0</code>.
            </p>
          </div>

          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl space-y-1">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              2. SELECT FOR UPDATE Locking
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Acquires exclusive row-level locks on accounts in sorted order (<code className="text-cyan-300">ORDER BY id</code>). Serializes concurrent operations and eliminates double-spending race conditions.
            </p>
          </div>

          <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl space-y-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              3. Deferred ACID Invariance
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <code className="text-amber-300">DEFERRABLE INITIALLY DEFERRED</code> verifies balance equilibrium at <code className="text-amber-300">COMMIT</code>. If lines are unbalanced by 1 cent, the entire transaction rolls back.
            </p>
          </div>
        </div>
      </div>

      {/* Trial Balance & Accounts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trial Balance Card */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              Trial Balance Verification
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                trialBalanceDiff === 0
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {trialBalanceDiff === 0 ? "IN EQUILIBRIUM" : "IMBALANCED"}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl flex justify-between items-center">
              <span className="text-gray-400">Total Debits (+):</span>
              <span className="text-emerald-400 font-bold">
                ${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl flex justify-between items-center">
              <span className="text-gray-400">Total Credits (-):</span>
              <span className="text-amber-400 font-bold">
                ${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-[#111115] border border-[#222228] rounded-xl flex justify-between items-center">
              <span className="text-gray-400">Net Ledger Variance:</span>
              <span className={`font-bold ${trialBalanceDiff === 0 ? "text-cyan-400" : "text-rose-400"}`}>
                ${trialBalanceDiff.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Assets = Liabilities + Equity + Retained Operating Margins. Double-entry equilibrium is verified across all accounts.
          </p>
        </div>

        {/* Ledger Accounts Table with Live Lock Status Indicator */}
        <div className="lg:col-span-2 bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                General Ledger Chart of Accounts
              </h3>
              {activeLockedAccounts.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {activeLockedAccounts.length} ROW(S) LOCKED
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 font-mono">{accounts.length} accounts</span>
          </div>

          <div className="bg-[#0B0B0E] border border-[#222228] rounded-xl overflow-hidden font-mono text-xs max-h-56 overflow-y-auto divide-y divide-[#181820]">
            {accounts.map((acc) => {
              const isLocked = activeLockedAccounts.includes(acc.id);
              return (
                <div
                  key={acc.id}
                  className={`p-2.5 flex items-center justify-between transition ${
                    isLocked ? "bg-amber-500/10 border-l-2 border-amber-400" : "hover:bg-[#121217]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        acc.type === "asset"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : acc.type === "liability"
                          ? "bg-purple-500/20 text-purple-300"
                          : acc.type === "equity"
                          ? "bg-amber-500/20 text-amber-300"
                          : acc.type === "revenue"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {acc.type}
                    </span>
                    <span className="text-gray-200">{acc.name}</span>
                    {isLocked && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> FOR UPDATE
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-bold ${
                      acc.balance >= 0 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {acc.balance >= 0
                      ? `+$${acc.balance.toLocaleString()}`
                      : `-$${Math.abs(acc.balance).toLocaleString()}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRIMARY SAFE SETTLEMENT TOGGLE & CONTROLS BANNER */}
      <div className="bg-[#16161A] border-2 border-[#1F1F23] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#23232A]">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setSafeSettlementEnabled(!safeSettlementEnabled)}
              className="relative inline-flex items-center cursor-pointer focus:outline-none"
              title="Toggle Safe Settlement pessimistic row-level locking"
            >
              <div
                className={`w-14 h-7.5 rounded-full transition-colors duration-200 ease-in-out p-1 ${
                  safeSettlementEnabled ? "bg-emerald-600" : "bg-gray-700"
                }`}
              >
                <div
                  className={`w-5.5 h-5.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    safeSettlementEnabled ? "translate-x-6.5" : "translate-x-0"
                  }`}
                />
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {safeSettlementEnabled ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  )}
                  Safe Settlement: SELECT FOR UPDATE Pessimistic Locking
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    safeSettlementEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {safeSettlementEnabled ? "ACTIVE (PROTECTED)" : "DISABLED (VULNERABLE)"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {safeSettlementEnabled
                  ? "Uses PostgreSQL `SELECT ... FOR UPDATE` to acquire exclusive row-level locks on accounts in deterministic order. Prevents race conditions and double-spending across parallel settlements."
                  : "Unsafe non-locking read (`SELECT balance`). Concurrent transactions can read stale balances simultaneously, causing critical double-spending drift."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-[11px] font-mono text-gray-400 bg-[#0F0F13] px-2.5 py-1.5 rounded-lg border border-[#23232C]">
              {safeSettlementEnabled
                ? "LOCK: EXCLUSIVE ROW (FOR UPDATE)"
                : "LOCK: NONE (SHARED READ)"}
            </span>
          </div>
        </div>

        {/* Quick Scenario Preset Launchers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <button
            type="button"
            onClick={handleLoadBalancedScenario}
            className="p-2.5 rounded-xl bg-[#111115] hover:bg-[#1A1A22] border border-[#23232C] text-left transition cursor-pointer group"
          >
            <div className="font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              1. Balanced Settlement ($0)
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Multi-row arbitrage lines with SUM = 0. Tests commit with row locks.
            </p>
          </button>

          <button
            type="button"
            onClick={handleLoadUnbalancedScenario}
            className="p-2.5 rounded-xl bg-[#111115] hover:bg-[#1A1A22] border border-[#23232C] text-left transition cursor-pointer group"
          >
            <div className="font-bold text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              2. Unbalanced Imbalance
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Violates SUM(amount) = 0. Tests DEFERRABLE trigger rollback at COMMIT.
            </p>
          </button>

          <button
            type="button"
            onClick={handleArmDoubleSpendAttack}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer group ${
              simulatedDoubleSpendAttempt
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                : "bg-[#111115] hover:bg-[#1A1A22] border-[#23232C] text-gray-300"
            }`}
          >
            <div className="font-bold text-rose-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              3. Simulate Double-Spend Race
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Simulates 2 competing searchers draining identical funds simultaneously.
            </p>
          </button>

          <button
            type="button"
            onClick={handleRunMultiWorkerRace}
            disabled={isSimulatingRace}
            className="p-2.5 rounded-xl bg-[#111115] hover:bg-[#1A1A22] border border-cyan-500/30 text-left transition cursor-pointer group disabled:opacity-50"
          >
            <div className="font-bold text-cyan-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {isSimulatingRace ? "Running Race..." : "4. 5-Worker Race Test"}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Fires 5 concurrent searchers at the same millisecond to test serialization.
            </p>
          </button>
        </div>
      </div>

      {/* Concurrent Multi-Worker Race Results (if run) */}
      {multiWorkerResults && (
        <div className="bg-[#16161A] border border-cyan-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              5-Worker Concurrent Race Simulation Results
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                safeSettlementEnabled
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300"
              }`}>
                {safeSettlementEnabled ? "SAFE SETTLEMENT PROTECTED" : "UNSAFE DOUBLE-SPEND DRIFT OCCURRED"}
              </span>
            </h3>
            <button
              onClick={() => setMultiWorkerResults(null)}
              className="text-xs text-gray-400 hover:text-white font-mono"
            >
              Close Results
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {multiWorkerResults.map((res) => (
              <div
                key={res.workerId}
                className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                  res.status === "ACQUIRED_COMMIT"
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : res.status === "BLOCKED_ROLLBACK"
                    ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{res.workerName}</span>
                  <span>+{res.lockWaitMs}ms</span>
                </div>
                <div className="text-[10px] font-sans text-gray-300">
                  {res.status === "ACQUIRED_COMMIT" && "✅ Lock Acquired -> COMMITTED"}
                  {res.status === "BLOCKED_ROLLBACK" && "🛡️ Lock Serialized -> ROLLBACK"}
                  {res.status === "UNSAFE_DOUBLE_SPENT" && "💥 Double-Spent Stale Balance!"}
                </div>
                <div className="text-[10px] text-gray-400 pt-1 border-t border-white/10">
                  Requested: ${res.amount.toLocaleString()}<br />
                  Bal After: ${res.balanceAfter.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive SQL Transaction Posting Simulator */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23232A]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Interactive SQL Transaction & Trigger Simulator
            </h3>
            <p className="text-xs text-gray-400">
              Compose multi-row ledger lines and test <code className="text-emerald-300 font-mono">SELECT FOR UPDATE</code> locking and <code className="text-emerald-300 font-mono">verify_journal_entry_balance()</code> in real-time.
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Journal Entry Description</label>
            <input
              type="text"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="w-full bg-[#101014] border border-[#2B2B33] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Ledger Line Items (Debit: Positive, Credit: Negative)</span>
              <span>
                Net Balance:{" "}
                <strong
                  className={`font-mono ${
                    currentLinesSum === 0 ? "text-emerald-400" : "text-rose-400 font-bold"
                  }`}
                >
                  {currentLinesSum > 0 ? "+" : ""}
                  {currentLinesSum.toFixed(4)}
                </strong>
              </span>
            </div>

            <div className="space-y-2">
              {txLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={line.accountId}
                    onChange={(e) => handleUpdateLine(idx, "accountId", e.target.value)}
                    className="flex-1 bg-[#101014] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.type.toUpperCase()}] {a.name} (Bal: ${a.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={line.amount}
                    onChange={(e) => handleUpdateLine(idx, "amount", Number(e.target.value))}
                    placeholder="Amount (+ Debit / - Credit)"
                    className="w-48 bg-[#101014] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-500"
                  />

                  <button
                    onClick={() => handleRemoveLine(idx)}
                    disabled={txLines.length <= 2}
                    className="p-2 rounded-xl bg-[#202028] hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 disabled:opacity-30 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <button
                onClick={handleAddLine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202028] hover:bg-[#2B2B36] text-xs font-mono text-gray-300 border border-[#2D2D38] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Ledger Line
              </button>

              <button
                onClick={handleSimulateCommit}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-lg cursor-pointer ${
                  safeSettlementEnabled
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {safeSettlementEnabled
                    ? "Execute Safe Settlement (SELECT FOR UPDATE)"
                    : "Execute Transaction (Unsafe Read / No Lock)"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Execution Result Banner & SQL Trace */}
        {lastExecutionResult && (
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed space-y-3 ${
              lastExecutionResult.status === "SUCCESS"
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                : lastExecutionResult.status === "BLOCKED"
                ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
                : "bg-red-950/20 border-red-500/40 text-red-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold font-mono">
                {lastExecutionResult.status === "SUCCESS" ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : lastExecutionResult.status === "BLOCKED" ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                {lastExecutionResult.message}
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                {lastExecutionResult.timestamp}
              </span>
            </div>

            {lastExecutionResult.details && (
              <p className="text-gray-300 text-[11px] font-sans">
                {lastExecutionResult.details}
              </p>
            )}

            {/* Live SQL Execution Trace */}
            {lastExecutionResult.sqlTrace && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    PostgreSQL Execution SQL Trace:
                  </span>
                  <button
                    onClick={() => handleCopy(lastExecutionResult.sqlTrace!, "sql_trace")}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "sql_trace" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy Trace
                  </button>
                </div>
                <pre className="p-3 bg-[#0B0B0E] border border-[#23232C] rounded-lg text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
                  {lastExecutionResult.sqlTrace}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POSTED JOURNAL ENTRIES LEDGER TABLE */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23232A]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Posted Journal Entries Ledger ({journalEntries.length})
            </h3>
            <p className="text-xs text-gray-400">
              Audit trail of all persisted and committed double-entry journal vouchers with Safe Settlement indicators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search entries..."
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                className="bg-[#101014] border border-[#2B2B33] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 w-44"
              />
            </div>

            <button
              onClick={handleExportJournalJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202028] hover:bg-[#2B2B36] text-xs font-mono text-gray-300 border border-[#2D2D38] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredJournalEntries.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500 font-mono">
              No journal entries found matching criteria.
            </div>
          ) : (
            filteredJournalEntries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="bg-[#0F0F13] border border-[#222228] rounded-xl overflow-hidden text-xs transition hover:border-[#2C2C36]"
                >
                  <div
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-emerald-400 font-bold">{entry.id}</span>
                      <span className="text-gray-200 font-medium">{entry.description}</span>
                      {entry.safeSettlementLocked ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Safe Settlement Locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5" /> Non-Locking Read
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-gray-400 font-mono">
                      <span>{entry.lines.length} lines</span>
                      <span>Net: $0.00</span>
                      <span className="text-gray-500 text-[11px]">
                        {new Date(entry.postedAt).toLocaleTimeString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Lines */}
                  {isExpanded && (
                    <div className="p-3.5 bg-[#09090C] border-t border-[#1C1C22] space-y-2">
                      <div className="text-[11px] font-mono text-gray-400 font-semibold">
                        Ledger Lines for {entry.id}:
                      </div>
                      <div className="space-y-1.5 font-mono text-xs">
                        {entry.lines.map((l) => (
                          <div
                            key={l.id}
                            className="p-2 rounded-lg bg-[#121216] flex items-center justify-between"
                          >
                            <span className="text-gray-300">{l.accountName}</span>
                            <span
                              className={`font-bold ${
                                l.amount > 0 ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {l.amount > 0
                                ? `+$${l.amount.toLocaleString()} (Debit)`
                                : `-$${Math.abs(l.amount).toLocaleString()} (Credit)`}
                            </span>
                          </div>
                        ))}
                      </div>

                      {entry.sqlTrace && (
                        <div className="mt-3 pt-2 border-t border-[#1C1C22] space-y-1">
                          <div className="text-[10px] text-gray-500 font-mono">Executed SQL Trace:</div>
                          <pre className="p-2.5 bg-[#050508] border border-[#1A1A22] rounded text-emerald-400/90 font-mono text-[11px] overflow-x-auto leading-relaxed">
                            {entry.sqlTrace}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SQL Schema Definition Viewer */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Complete PostgreSQL Migration: schema.sql
          </span>
          <button
            onClick={() => handleCopy(POSTGRES_DOUBLE_ENTRY_SCHEMA_SQL, "sql_schema_body")}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono cursor-pointer"
          >
            {copiedKey === "sql_schema_body" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            Copy SQL
          </button>
        </div>

        <pre className="p-4 bg-[#0A0B0E] border border-[#222228] rounded-xl text-emerald-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-72">
          {POSTGRES_DOUBLE_ENTRY_SCHEMA_SQL}
        </pre>
      </div>
    </div>
  );
};
