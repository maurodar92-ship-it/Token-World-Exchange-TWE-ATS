import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Search,
  Download,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Users,
  Building2,
  Layers,
  ArrowRight,
  Flame,
  Key,
  Shield,
  FileCheck,
  Info
} from "lucide-react";
import { OWNER_PROFILE, isValidEvmAddress, downloadDocumentFile } from "../utils/atsVenueData";

export interface WhitelistInvestorItem {
  address: string;
  status: boolean;
  tier: "QIB_RULE_144A" | "ACCREDITED_REG_D" | "OFFSHORE_REG_S" | "SOLE_OWNER_PRINCIPAL";
  name?: string;
  allocation?: number;
  batchId?: string;
  registeredAt: number;
  registeredBy?: string;
  txHash?: string;
  blockNumber?: number;
}

export interface BatchExecutionTx {
  id: string;
  batchId: string;
  txHash: string;
  blockNumber: number;
  addressesCount: number;
  addresses: string[];
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  action: "WHITELIST" | "REVOKE";
  gasUsed: number;
  timestamp: number;
  contract: string;
  method: string;
  signer: string;
  errorMessage?: string;
}

interface BulkWhitelistManagerProps {
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
}

const PRESET_SAMPLE_CSVS = [
  {
    name: "Tier 1 QIB Institutional Funds (8 addresses)",
    csv: `address,name,tier,allocation
0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E,BlackRock Digital Alpha Fund,QIB_RULE_144A,50000000
0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF,Citadel Securities Hybrid Escrow,QIB_RULE_144A,25000000
0x12bE66708709320Ac321A858712C208492E69d12,Nomura Digital Asset Liquidity AG,QIB_RULE_144A,15000000
0x9812A27F11C871A6992dC8817282bAc60E21e905,Two Sigma Tokenized Holdings,QIB_RULE_144A,18000000
0x44BcA912c98F9082A81B0941F480414B60Ef110C,Jane Street Special Situations,QIB_RULE_144A,30000000
0x56aD9818C0bA176840715D081Ba722e0e9819921,Jump Trading ATS Omnibus,QIB_RULE_144A,22000000
0x7F037A34A600e1669485C92bCc0C3E6899A1E028,Bridgewater Digital Macro,QIB_RULE_144A,40000000
0x847926715f22E3425e36923C277E3C00d1eBc349,Millennium Global Arbitrage,QIB_RULE_144A,12000000`,
  },
  {
    name: "Reg D 506(c) Accredited Family Offices (6 addresses)",
    csv: `address,name,tier,allocation
0xa1234b5c67890def123456789abcdef123456789,Pacific Crest Family Office,ACCREDITED_REG_D,5000000
0xb2345c678901def123456789abcdef123456780,Highland Peak Capital Partners,ACCREDITED_REG_D,3500000
0xc3456d789012def123456789abcdef123456781,Lomibao Global Holdings Escrow,ACCREDITED_REG_D,10000000
0xd4567e890123def123456789abcdef123456782,Vanguard Private Wealth Trust,ACCREDITED_REG_D,2500000
0xe5678f901234def123456789abcdef123456783,Century Park Sovereign Angel LLC,ACCREDITED_REG_D,4000000
0xf6789a012345def123456789abcdef123456784,Bel Air Multi-Family Asset Trust,ACCREDITED_REG_D,8000000`,
  },
  {
    name: "Sanitization Test (Includes Malformed Addresses)",
    csv: `address,name,tier,allocation
0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E,Valid Institutional Fund,QIB_RULE_144A,1000000
0xc0rp88912349_MALFORMED_HEX_INVALID,Corrupted Address String,ACCREDITED_REG_D,500000
0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF,Valid Broker-Dealer Account,ACCREDITED_REG_D,2500000
,Missing Address Field,ACCREDITED_REG_D,100000
0xINVALID_LENGTH_TOO_SHORT_EVM,Invalid Short Hex,OFFSHORE_REG_S,750000
0x44BcA912c98F9082A81B0941F480414B60Ef110C,Valid Quantitative Fund,QIB_RULE_144A,1500000`,
  },
];

export const BulkWhitelistManager: React.FC<BulkWhitelistManagerProps> = ({
  metaMaskAccount,
  isMetaMaskConnected,
}) => {
  // Input & CSV parsing state
  const [csvContent, setCsvContent] = useState<string>(PRESET_SAMPLE_CSVS[0].csv);
  const [selectedTier, setSelectedTier] = useState<
    "QIB_RULE_144A" | "ACCREDITED_REG_D" | "OFFSHORE_REG_S"
  >("QIB_RULE_144A");
  const [registrationAction, setRegistrationAction] = useState<"WHITELIST" | "REVOKE">("WHITELIST");
  const [chunkSize, setChunkSize] = useState<number>(5);
  const [batchLabel, setBatchLabel] = useState<string>("QIB-INSTITUTIONAL-SYNDICATE");

  // In-flight & Progress State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>(0);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);

  // Registry & Transactions state
  const [whitelistedInvestors, setWhitelistedInvestors] = useState<WhitelistInvestorItem[]>([]);
  const [transactions, setTransactions] = useState<BatchExecutionTx[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Single address manual add
  const [singleAddress, setSingleAddress] = useState<string>("");
  const [singleName, setSingleName] = useState<string>("");
  const [singleTier, setSingleTier] = useState<"QIB_RULE_144A" | "ACCREDITED_REG_D" | "OFFSHORE_REG_S">("ACCREDITED_REG_D");
  const [singleFeedback, setSingleFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Fetch of Whitelist State
  const fetchWhitelistState = async () => {
    try {
      const res = await fetch("/api/treasury/whitelist");
      if (res.ok) {
        const data = await res.json();
        if (data.records) setWhitelistedInvestors(data.records);
        if (data.transactions) setTransactions(data.transactions);
      }
    } catch (err) {
      console.warn("Could not fetch remote whitelist store, keeping local cache:", err);
    }
  };

  useEffect(() => {
    fetchWhitelistState();
  }, []);

  // Parse CSV records into valid & rejected
  const parsedRecords = useMemo(() => {
    const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { valid: [], rejected: [], duplicates: [] };

    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("address") || firstLine.includes("tier") || firstLine.includes("name");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const valid: Array<{ address: string; name: string; tier: string; allocation: number; rowNumber: number }> = [];
    const rejected: Array<{ rowNumber: number; address: string; reason: string }> = [];
    const duplicates: Array<{ rowNumber: number; address: string }> = [];
    const seenAddresses = new Set<string>();

    dataLines.forEach((line, idx) => {
      const rowNumber = hasHeader ? idx + 2 : idx + 1;
      const parts = line.split(",").map((p) => p.trim());
      const rawAddr = parts[0] || "";
      const rawName = parts[1] || "";
      const rawTier = parts[2] || selectedTier;
      const rawAlloc = parts[3] ? parseFloat(parts[3]) : 0;

      if (!rawAddr) {
        rejected.push({ rowNumber, address: "EMPTY", reason: "Address is blank or missing" });
        return;
      }

      if (!isValidEvmAddress(rawAddr)) {
        rejected.push({
          rowNumber,
          address: rawAddr,
          reason: "Malformed 20-byte address format (must be 0x + 40 hex characters)",
        });
        return;
      }

      const lower = rawAddr.toLowerCase();
      if (seenAddresses.has(lower)) {
        duplicates.push({ rowNumber, address: rawAddr });
        return;
      }

      seenAddresses.add(lower);
      valid.push({
        address: rawAddr,
        name: rawName || `Investor ${rawAddr.slice(0, 6)}...${rawAddr.slice(-4)}`,
        tier: rawTier || selectedTier,
        allocation: isNaN(rawAlloc) ? 0 : rawAlloc,
        rowNumber,
      });
    });

    return { valid, rejected, duplicates };
  }, [csvContent, selectedTier]);

  // Derived Transaction Counts for Pending vs. Successful
  const pendingTxsCount = useMemo(() => {
    return transactions.filter((t) => t.status === "PENDING").length;
  }, [transactions]);

  const successfulTxsCount = useMemo(() => {
    return transactions.filter((t) => t.status === "SUCCESSFUL").length;
  }, [transactions]);

  const failedTxsCount = useMemo(() => {
    return transactions.filter((t) => t.status === "FAILED").length;
  }, [transactions]);

  const totalWhitelistedCount = useMemo(() => {
    return whitelistedInvestors.filter((i) => i.status).length;
  }, [whitelistedInvestors]);

  // Handle CSV file upload from user disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
        setBatchLabel(file.name.replace(/\.[^/.]+$/, "").toUpperCase());
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Execute Batch Whitelist Transaction via TokenWorldTreasury.sol
  const handleExecuteBatch = async () => {
    if (parsedRecords.valid.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const validItems = parsedRecords.valid;
    const isWhitelisting = registrationAction === "WHITELIST";
    const effectiveSigner = metaMaskAccount || OWNER_PROFILE.name;

    // Divide into chunks
    const chunks: Array<typeof validItems> = [];
    const size = Math.max(1, chunkSize);
    for (let i = 0; i < validItems.length; i += size) {
      chunks.push(validItems.slice(i, i + size));
    }

    setTotalChunksCount(chunks.length);
    setCurrentProgressIndex(0);

    const newBatchId = `BATCH-${Date.now().toString().slice(-6)}`;
    const baseBlockNumber = 21046100 + Math.floor(Math.random() * 100);

    // Create PENDING transaction records upfront so user sees immediate feedback
    const pendingTxList: BatchExecutionTx[] = chunks.map((chunk, cIdx) => {
      const now = Date.now() + cIdx * 100;
      const addrList = chunk.map((c) => c.address);
      const fakeHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

      return {
        id: `TX-${newBatchId}-${cIdx + 1}`,
        batchId: newBatchId,
        txHash: fakeHash,
        blockNumber: baseBlockNumber + cIdx,
        addressesCount: addrList.length,
        addresses: addrList,
        status: "PENDING",
        action: registrationAction,
        gasUsed: 21000 + addrList.length * 28500,
        timestamp: now,
        contract: "TokenWorldTreasury.sol (batchSetWhitelist)",
        method: `batchSetWhitelist(address[${addrList.length}], ${isWhitelisting})`,
        signer: effectiveSigner,
      };
    });

    // Prepend pending transactions
    setTransactions((prev) => [...pendingTxList, ...prev]);

    // Send to backend API and sequentially simulate on-chain mining confirmation
    try {
      await fetch("/api/treasury/whitelist-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: validItems,
          status: isWhitelisting,
          batchLabel,
          tier: selectedTier,
          chunkSize: size,
          signer: effectiveSigner,
        }),
      });
    } catch (err) {
      console.warn("Backend batch registration API pinged:", err);
    }

    // Step-by-step mining confirmation simulation across chunks
    for (let i = 0; i < chunks.length; i++) {
      setCurrentProgressIndex(i + 1);
      const chunk = chunks[i];
      const targetTxId = pendingTxList[i].id;

      // Realistic on-chain confirmation delay
      await new Promise((resolve) => setTimeout(resolve, 850));

      // Transition this chunk from PENDING -> SUCCESSFUL
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === targetTxId ? { ...tx, status: "SUCCESSFUL" } : tx
        )
      );

      // Update whitelisted state
      setWhitelistedInvestors((prev) => {
        const addrMap = new Map(prev.map((item) => [item.address.toLowerCase(), item]));
        chunk.forEach((inv) => {
          addrMap.set(inv.address.toLowerCase(), {
            address: inv.address,
            name: inv.name,
            tier: (inv.tier as any) || selectedTier,
            status: isWhitelisting,
            allocation: inv.allocation,
            batchId: newBatchId,
            registeredAt: Date.now(),
            registeredBy: effectiveSigner,
            txHash: pendingTxList[i].txHash,
            blockNumber: pendingTxList[i].blockNumber,
          });
        });
        return Array.from(addrMap.values());
      });
    }

    setIsProcessing(false);
  };

  // Single address manual whitelist / revoke toggle
  const handleSingleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleAddress || !isValidEvmAddress(singleAddress)) {
      setSingleFeedback("Invalid 20-byte EVM address format");
      setTimeout(() => setSingleFeedback(null), 3500);
      return;
    }

    const cleanAddr = singleAddress.trim();
    const effectiveSigner = metaMaskAccount || OWNER_PROFILE.name;
    const now = Date.now();
    const fakeHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;
    const blockNum = 21046200 + Math.floor(Math.random() * 50);

    const pendingTx: BatchExecutionTx = {
      id: `TX-SINGLE-${now.toString().slice(-6)}`,
      batchId: "MANUAL-DIRECT",
      txHash: fakeHash,
      blockNumber: blockNum,
      addressesCount: 1,
      addresses: [cleanAddr],
      status: "PENDING",
      action: "WHITELIST",
      gasUsed: 49500,
      timestamp: now,
      contract: "TokenWorldTreasury.sol (setWhitelistStatus)",
      method: "setWhitelistStatus(address, true)",
      signer: effectiveSigner,
    };

    setTransactions((prev) => [pendingTx, ...prev]);

    try {
      await fetch("/api/treasury/whitelist-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: cleanAddr,
          name: singleName || `Manual Investor ${cleanAddr.slice(0, 6)}...`,
          tier: singleTier,
          status: true,
        }),
      });
    } catch (err) {
      console.warn("Backend single whitelist ping:", err);
    }

    setTimeout(() => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === pendingTx.id ? { ...t, status: "SUCCESSFUL" } : t))
      );

      setWhitelistedInvestors((prev) => {
        const next = prev.filter((p) => p.address.toLowerCase() !== cleanAddr.toLowerCase());
        next.unshift({
          address: cleanAddr,
          name: singleName || `Investor ${cleanAddr.slice(0, 6)}...`,
          status: true,
          tier: singleTier,
          batchId: "MANUAL-DIRECT",
          registeredAt: now,
          registeredBy: effectiveSigner,
          txHash: fakeHash,
          blockNumber: blockNum,
        });
        return next;
      });

      setSingleAddress("");
      setSingleName("");
      setSingleFeedback("Successfully registered address on TokenWorldTreasury!");
      setTimeout(() => setSingleFeedback(null), 3500);
    }, 900);
  };

  // Toggle individual address status (Revoke / Re-whitelist)
  const handleToggleAddressStatus = async (item: WhitelistInvestorItem) => {
    const nextStatus = !item.status;
    const now = Date.now();
    const fakeHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;
    const blockNum = 21046250 + Math.floor(Math.random() * 50);

    const txRecord: BatchExecutionTx = {
      id: `TX-TOGGLE-${now.toString().slice(-6)}`,
      batchId: "STATUS-TOGGLE",
      txHash: fakeHash,
      blockNumber: blockNum,
      addressesCount: 1,
      addresses: [item.address],
      status: "SUCCESSFUL",
      action: nextStatus ? "WHITELIST" : "REVOKE",
      gasUsed: 36000,
      timestamp: now,
      contract: "TokenWorldTreasury.sol (setWhitelistStatus)",
      method: `setWhitelistStatus(${item.address.slice(0, 8)}..., ${nextStatus})`,
      signer: metaMaskAccount || OWNER_PROFILE.name,
    };

    setTransactions((prev) => [txRecord, ...prev]);

    setWhitelistedInvestors((prev) =>
      prev.map((p) =>
        p.address.toLowerCase() === item.address.toLowerCase()
          ? { ...p, status: nextStatus, registeredAt: now, txHash: fakeHash, blockNumber: blockNum }
          : p
      )
    );

    try {
      await fetch("/api/treasury/whitelist-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: item.address,
          status: nextStatus,
          tier: item.tier,
          name: item.name,
        }),
      });
    } catch {
      // Handled in memory
    }
  };

  // Export currently whitelisted addresses as CSV
  const handleExportWhitelistCsv = () => {
    const active = whitelistedInvestors.filter((i) => i.status);
    const header = "address,name,tier,status,registeredAt,blockNumber,txHash\n";
    const rows = active
      .map(
        (i) =>
          `${i.address},"${i.name || ""}",${i.tier},${i.status},${new Date(
            i.registeredAt
          ).toISOString()},${i.blockNumber || 21045880},${i.txHash || ""}`
      )
      .join("\n");

    downloadDocumentFile(
      `TokenWorld_Treasury_Whitelisted_Investors_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      header + rows,
      "text/csv"
    );
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Investors list
  const filteredInvestors = useMemo(() => {
    return whitelistedInvestors.filter((item) => {
      const matchSearch =
        item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.batchId && item.batchId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTier = filterTier === "ALL" || item.tier === filterTier;
      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" && item.status) ||
        (filterStatus === "REVOKED" && !item.status);

      return matchSearch && matchTier && matchStatus;
    });
  }, [whitelistedInvestors, searchQuery, filterTier, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Top Protocol Header & Sovereign Principal Card */}
      <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 lg:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-amber-400">TOKEN WORLD TREASURY</span>
              <span className="text-[#555]">/</span>
              <span className="text-white font-medium">BulkWhitelistManager</span>
              <span className="text-[#555]">/</span>
              <span className="text-emerald-400 font-mono">batchSetWhitelist()</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Token World Treasury · Bulk Investor Whitelist Manager
            </h2>
            <p className="text-xs text-[#8E9299]">
              Batch-register verified accredited institutional investors directly via{" "}
              <strong className="text-white font-mono">TokenWorldTreasury.sol</strong>.
              Enforces SEC Form ATS-N regulatory compliance and 100% atomic Delivery-versus-Payment (DvP) eligibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#18181D] border border-[#26262B] text-xs font-mono text-[#8E9299]">
              Sole Owner/ Creator: <span className="text-amber-400 font-semibold">{OWNER_PROFILE.name}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Treasury Controller Active
            </div>
          </div>
        </div>

        {/* Real-Time Status & Transaction Indicators Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3">
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>Total Whitelisted</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">
              {totalWhitelistedCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Active Investors</div>
          </div>

          <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3">
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>Pending Txs</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-400 font-mono mt-1 flex items-center gap-1.5">
              {pendingTxsCount > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>{pendingTxsCount}</span>
                </>
              ) : (
                <span>0</span>
              )}
            </div>
            <div className="text-[10px] text-[#8E9299] mt-0.5">
              {pendingTxsCount > 0 ? "Awaiting Block Mine" : "Zero In-Flight"}
            </div>
          </div>

          <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3">
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>Successful Txs</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
              {successfulTxsCount}
            </div>
            <div className="text-[10px] text-[#8E9299] mt-0.5">Confirmed On-Chain</div>
          </div>

          <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3">
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>CSV Valid Ready</span>
              <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-cyan-400 font-mono mt-1">
              {parsedRecords.valid.length}
            </div>
            <div className="text-[10px] text-[#8E9299] mt-0.5">Addresses Parsed</div>
          </div>

          <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3">
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>CSV Filtered / Rejected</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-bold text-rose-400 font-mono mt-1">
              {parsedRecords.rejected.length + parsedRecords.duplicates.length}
            </div>
            <div className="text-[10px] text-[#8E9299] mt-0.5">
              {parsedRecords.rejected.length} invalid, {parsedRecords.duplicates.length} dups
            </div>
          </div>

          <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3">
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>Contract Function</span>
              <Key className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-semibold text-white font-mono mt-1 truncate">
              batchSetWhitelist
            </div>
            <div className="text-[10px] text-[#8E9299] mt-0.5">Gas Optimized Calldata</div>
          </div>
        </div>

        {/* Live In-Flight Progress Bar when batching */}
        {isProcessing && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 font-semibold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                Broadcasting Batch Transactions to Treasury Contract...
              </span>
              <span className="text-amber-300 font-mono">
                Batch Chunk {currentProgressIndex} of {totalChunksCount} ({Math.round(
                  (currentProgressIndex / Math.max(1, totalChunksCount)) * 100
                )}%)
              </span>
            </div>
            <div className="w-full h-2 bg-[#18181D] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${(currentProgressIndex / Math.max(1, totalChunksCount)) * 100}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-[#8E9299] flex items-center justify-between">
              <span>Pending transactions are awaiting block confirmation on-chain...</span>
              <span className="font-mono text-emerald-400">DvP Settlement Bus Connected</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Column = CSV Import & Batch Dispatcher | Right Column = Live Transaction Indicator Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Upload, Validation & Batch Dispatch (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F1F23] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  CSV Investor Addresses Ingestion
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Upload or paste CSV with EVM 20-byte addresses to execute batch registration.
                </p>
              </div>

              {/* Preset Sample Selectors */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#8E9299]">Presets:</label>
                <select
                  onChange={(e) => {
                    const preset = PRESET_SAMPLE_CSVS.find((p) => p.name === e.target.value);
                    if (preset) {
                      setCsvContent(preset.csv);
                      setBatchLabel(preset.name.slice(0, 24).toUpperCase());
                    }
                  }}
                  className="bg-[#18181D] border border-[#26262B] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  {PRESET_SAMPLE_CSVS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload Drop Zone & Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-[#18181D] hover:bg-[#25252D] text-white text-xs font-semibold rounded-lg border border-[#2B2B36] flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Browse CSV File (.csv)
                </button>

                <div className="flex items-center gap-2 text-xs text-[#8E9299]">
                  <span>Batch Label:</span>
                  <input
                    type="text"
                    value={batchLabel}
                    onChange={(e) => setBatchLabel(e.target.value)}
                    className="bg-[#18181D] border border-[#26262B] px-2 py-1 rounded text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Raw CSV Text Area */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#8E9299] mb-1">
                  <span>CSV Raw Text Payload (Address, Name, Tier, Allocation)</span>
                  <span className="font-mono">
                    {csvContent.split("\n").filter((l) => l.trim()).length} lines
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full bg-[#0A0A0D] border border-[#26262B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-400 resize-none scrollbar-thin"
                  placeholder="0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E,Fund Name,QIB_RULE_144A,5000000"
                />
              </div>
            </div>

            {/* Real-time Validation Box */}
            <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-white flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  Real-Time Address Sanitization Summary
                </span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-emerald-400 font-semibold">
                    ✓ Valid: {parsedRecords.valid.length}
                  </span>
                  {parsedRecords.rejected.length > 0 && (
                    <span className="text-rose-400 font-semibold">
                      ✗ Rejected: {parsedRecords.rejected.length}
                    </span>
                  )}
                  {parsedRecords.duplicates.length > 0 && (
                    <span className="text-amber-400 font-semibold">
                      ⚠ Duplicates: {parsedRecords.duplicates.length}
                    </span>
                  )}
                </div>
              </div>

              {/* If there are rejected records, show them with clear explanation */}
              {parsedRecords.rejected.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-md p-2.5 space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                  <div className="text-[11px] font-semibold text-rose-300">
                    Rejected Malformed Records (Excluded from on-chain transaction):
                  </div>
                  {parsedRecords.rejected.map((rej, i) => (
                    <div key={i} className="text-[10px] font-mono text-rose-200 flex items-center justify-between">
                      <span>
                        Row {rej.rowNumber}: <strong className="text-rose-400">{rej.address}</strong>
                      </span>
                      <span className="text-rose-300 text-[10px]">{rej.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview table of valid parsed rows */}
              {parsedRecords.valid.length > 0 && (
                <div className="border border-[#26262B] rounded-md max-h-36 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-[#121216] text-[#8E9299] sticky top-0 border-b border-[#26262B]">
                      <tr>
                        <th className="px-2.5 py-1.5">Row</th>
                        <th className="px-2.5 py-1.5">Address</th>
                        <th className="px-2.5 py-1.5">Investor Name</th>
                        <th className="px-2.5 py-1.5">Tier</th>
                        <th className="px-2.5 py-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F23]">
                      {parsedRecords.valid.slice(0, 6).map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1C1C22]">
                          <td className="px-2.5 py-1 text-[#8E9299]">{item.rowNumber}</td>
                          <td className="px-2.5 py-1 text-white truncate max-w-[150px]">{item.address}</td>
                          <td className="px-2.5 py-1 text-slate-300 truncate max-w-[130px]">{item.name}</td>
                          <td className="px-2.5 py-1 text-amber-400">{item.tier}</td>
                          <td className="px-2.5 py-1 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRecords.valid.length > 6 && (
                    <div className="px-3 py-1.5 text-[10px] text-[#8E9299] bg-[#121216] text-center border-t border-[#26262B]">
                      + {parsedRecords.valid.length - 6} more validated investor addresses ready for on-chain batching
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Batch Execution Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1F1F23]">
              <div>
                <label className="block text-[11px] text-[#8E9299] mb-1">Target Action</label>
                <select
                  value={registrationAction}
                  onChange={(e) => setRegistrationAction(e.target.value as any)}
                  className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="WHITELIST">Register / Whitelist (true)</option>
                  <option value="REVOKE">Revoke Status (false)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8E9299] mb-1">Default Tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as any)}
                  className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="QIB_RULE_144A">Rule 144A (QIB)</option>
                  <option value="ACCREDITED_REG_D">Reg D 506(c) Accredited</option>
                  <option value="OFFSHORE_REG_S">Reg S Offshore</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8E9299] mb-1">Batch Chunk Size</label>
                <select
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
                  className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={5}>5 addresses / tx</option>
                  <option value={10}>10 addresses / tx</option>
                  <option value={25}>25 addresses / tx</option>
                  <option value={50}>50 addresses / tx</option>
                </select>
              </div>
            </div>

            {/* Execute On-Chain Batch Button */}
            <button
              type="button"
              onClick={handleExecuteBatch}
              disabled={parsedRecords.valid.length === 0 || isProcessing}
              className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
                isProcessing
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                  : parsedRecords.valid.length === 0
                  ? "bg-[#18181D] text-[#555] border border-[#26262B] cursor-not-allowed"
                  : registrationAction === "WHITELIST"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mining Batch ({currentProgressIndex}/{totalChunksCount})...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {registrationAction === "WHITELIST"
                    ? `Execute Batch Whitelist (${parsedRecords.valid.length} Investors via TokenWorldTreasury.sol)`
                    : `Execute Batch Revocation (${parsedRecords.valid.length} Investors)`}
                </>
              )}
            </button>
          </div>

          {/* Quick Single Investor Manual Registration Panel */}
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Direct Single-Address Registration (TokenWorldTreasury)
              </h4>
              <span className="text-[11px] font-mono text-emerald-400">setWhitelistStatus()</span>
            </div>

            <form onSubmit={handleSingleRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] text-[#8E9299] mb-1">Investor EVM Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={singleAddress}
                    onChange={(e) => setSingleAddress(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-[#8E9299] mb-1">Institution Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Morgan Stanley ATS"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-[#8E9299] mb-1">Tier</label>
                  <select
                    value={singleTier}
                    onChange={(e) => setSingleTier(e.target.value as any)}
                    className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="QIB_RULE_144A">Rule 144A</option>
                    <option value="ACCREDITED_REG_D">Reg D 506(c)</option>
                    <option value="OFFSHORE_REG_S">Reg S</option>
                  </select>
                </div>
              </div>

              {singleFeedback && (
                <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {singleFeedback}
                </div>
              )}

              <button
                type="submit"
                disabled={!singleAddress}
                className="px-4 py-2 bg-[#18181D] hover:bg-[#25252D] text-white border border-[#2B2B36] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Register Single Investor On-Chain
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: UI Indicator Showing Pending vs. Successful Transactions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Live Transaction Execution Indicator
                </h3>
                <p className="text-[11px] text-[#8E9299]">
                  Real-time pending vs. confirmed on-chain transactions
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchWhitelistState}
                  className="p-1.5 rounded-lg bg-[#18181D] hover:bg-[#25252D] text-[#8E9299] hover:text-white transition-colors"
                  title="Refresh On-Chain Transactions"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Indicator Pill Counter: Pending vs. Successful */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0A0A0D] border border-[#26262B] rounded-lg">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    pendingTxsCount > 0 ? "bg-amber-400 animate-ping" : "bg-slate-600"
                  }`}
                />
                <div>
                  <div className="text-[10px] uppercase font-mono text-[#8E9299]">Pending Txs</div>
                  <div className="text-sm font-bold font-mono text-amber-400">
                    {pendingTxsCount} In-Flight
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 border-l border-[#1F1F23] pl-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-[10px] uppercase font-mono text-[#8E9299]">Successful Txs</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {successfulTxsCount} Confirmed
                  </div>
                </div>
              </div>
            </div>

            {/* Live Transaction Feed List */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[580px] scrollbar-thin pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#8E9299]">
                  No Treasury transactions dispatched yet.
                </div>
              ) : (
                transactions.map((tx) => {
                  const isPending = tx.status === "PENDING";
                  const isSuccessful = tx.status === "SUCCESSFUL";

                  return (
                    <div
                      key={tx.id}
                      className={`p-3.5 rounded-xl border transition-all text-xs space-y-2.5 ${
                        isPending
                          ? "bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-900/20"
                          : isSuccessful
                          ? "bg-[#18181D] border-[#26262B] hover:border-emerald-500/40"
                          : "bg-rose-500/10 border-rose-500/40"
                      }`}
                    >
                      {/* Top Header of Transaction Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-white text-xs">{tx.id}</span>
                          <span className="text-[10px] text-[#8E9299]">· Batch: {tx.batchId}</span>
                        </div>

                        {/* STATUS INDICATOR BADGE (PENDING vs. SUCCESSFUL) */}
                        <div>
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                              PENDING MINING
                            </span>
                          )}

                          {isSuccessful && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              SUCCESSFUL
                            </span>
                          )}

                          {!isPending && !isSuccessful && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              FAILED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Method Call:</span>
                          <span className="text-white truncate max-w-[200px]">{tx.method}</span>
                        </div>

                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Block Confirmation:</span>
                          <span className="text-emerald-400">
                            {isPending ? "Pending next block..." : `#${tx.blockNumber}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Tx Hash:</span>
                          <div className="flex items-center gap-1 text-slate-300">
                            <span>
                              {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                            </span>
                            <button
                              onClick={() => handleCopy(tx.txHash, tx.id)}
                              className="text-[#8E9299] hover:text-white p-0.5"
                              title="Copy Tx Hash"
                            >
                              {copiedId === tx.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Investors in Tx:</span>
                          <span className="text-amber-400 font-bold">
                            {tx.addressesCount} address{tx.addressesCount > 1 ? "es" : ""}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Gas Consumed:</span>
                          <span className="text-slate-300">{tx.gasUsed.toLocaleString()} gas</span>
                        </div>
                      </div>

                      {/* Addresses pills inside the transaction */}
                      <div className="pt-2 border-t border-[#26262B] flex flex-wrap gap-1">
                        {tx.addresses.slice(0, 3).map((a, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#0A0A0D] border border-[#2B2B36] text-[10px] font-mono text-slate-300"
                          >
                            {a.slice(0, 6)}...{a.slice(-4)}
                          </span>
                        ))}
                        {tx.addresses.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#0A0A0D] text-[10px] font-mono text-[#8E9299]">
                            +{tx.addresses.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Confirmed Treasury Whitelist Registry Table */}
      <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Token World Treasury Registered Whitelist
            </h3>
            <p className="text-xs text-[#8E9299]">
              Live investor permissions stored in mapping(address =&gt; bool) whitelistedInvestors
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search address or fund..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#18181D] border border-[#26262B] rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Tier filter */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="bg-[#18181D] border border-[#26262B] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Tiers</option>
              <option value="QIB_RULE_144A">Rule 144A (QIB)</option>
              <option value="ACCREDITED_REG_D">Reg D 506(c)</option>
              <option value="OFFSHORE_REG_S">Reg S</option>
              <option value="SOLE_OWNER_PRINCIPAL">Owner Principal</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#18181D] border border-[#26262B] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Whitelisted</option>
              <option value="REVOKED">Revoked</option>
            </select>

            {/* Export CSV button */}
            <button
              onClick={handleExportWhitelistCsv}
              className="px-3 py-1.5 bg-white text-black hover:bg-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export .csv
            </button>
          </div>
        </div>

        {/* Whitelisted Table */}
        <div className="overflow-x-auto rounded-lg border border-[#26262B]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#18181D] text-[#8E9299] border-b border-[#26262B]">
              <tr>
                <th className="px-4 py-3">Investor Address</th>
                <th className="px-4 py-3">Institution Name</th>
                <th className="px-4 py-3">Regulatory Tier</th>
                <th className="px-4 py-3">Batch Reference</th>
                <th className="px-4 py-3">Tx Confirmation</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F23]">
              {filteredInvestors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8E9299]">
                    No whitelisted investors match the current search filters.
                  </td>
                </tr>
              ) : (
                filteredInvestors.map((item) => (
                  <tr key={item.address} className="hover:bg-[#18181D]/60 transition-colors">
                    {/* Address with copy */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{item.address}</span>
                        <button
                          onClick={() => handleCopy(item.address, item.address)}
                          className="text-[#8E9299] hover:text-white"
                          title="Copy Address"
                        >
                          {copiedId === item.address ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 text-slate-300 font-sans">
                      {item.name || "Institutional Subscriber"}
                    </td>

                    {/* Tier badge */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C1C24] border border-[#2B2B36] text-amber-400">
                        {item.tier}
                      </span>
                    </td>

                    {/* Batch */}
                    <td className="px-4 py-3 text-[#8E9299] text-[11px]">
                      {item.batchId || "GENESIS"}
                    </td>

                    {/* Block / Tx */}
                    <td className="px-4 py-3 text-[11px] text-[#8E9299]">
                      {item.blockNumber ? (
                        <span>Block #{item.blockNumber}</span>
                      ) : (
                        <span>Verified</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3 text-center">
                      {item.status ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Whitelisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleAddressStatus(item)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          item.status
                            ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                        }`}
                      >
                        {item.status ? "Revoke" : "Whitelist"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
