import { useState, useMemo } from "react";
import { generateRandomHex, generateBase58, toChecksumAddress } from "../utils/cryptoGenerators";
import { StreamArtifactParams } from "../utils/contractArtifactGenerator";
import { StreamContractArtifactModal } from "./StreamContractArtifactModal";
import {
  Zap,
  Download,
  Play,
  Cpu,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Shield,
  Layers,
  StopCircle,
  Binary,
  Send,
  ShieldCheck,
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface StreamSampleRecord {
  contract_address: string;
  token_id: string;
  network_id: number;
  token_standard: string;
  launch_status: string;
  is_vanity: boolean;
}

const INITIAL_SAMPLE_RECORDS: StreamSampleRecord[] = [
  {
    contract_address: "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891",
    token_id: "10000000000000000000000000000001",
    network_id: 1,
    token_standard: "ERC-20",
    launch_status: "Deployed",
    is_vanity: true,
  },
  {
    contract_address: "0x0000000000FFe8B47B3e11CEEBb996d80F0E67E3",
    token_id: "25359998174201948572019485729104",
    network_id: 1,
    token_standard: "Enterprise ERC-20 Proxy",
    launch_status: "Audited",
    is_vanity: true,
  },
  {
    contract_address: "0x1967C5A376916524A600e12338A994B69Ac37688",
    token_id: "43370001928471928374619283746192",
    network_id: 8453,
    token_standard: "ERC-20",
    launch_status: "Deployed",
    is_vanity: true,
  },
  {
    contract_address: "0x2535D76e7b1657999B0182E47d8964d4A30B1C45",
    token_id: "88880000000000000000000000000008",
    network_id: 42161,
    token_standard: "ERC-721",
    launch_status: "Liquidity Locked",
    is_vanity: true,
  },
  {
    contract_address: "0xC0RP89F4b537A179427D60D64860D4e2a8685afe",
    token_id: "90000000000000000000000000000000",
    network_id: 1,
    token_standard: "Quantum-Hybrid",
    launch_status: "Audited",
    is_vanity: true,
  },
];

export const HighVolumeWorkerModal = () => {
  // Top-level sub-view: Stream Exporter vs Contract ID Artifact Engine
  const [activeEngineMode, setActiveEngineMode] = useState<"stream" | "artifacts">("stream");

  // Stream Configuration
  const [targetCount, setTargetCount] = useState<number>(1000000);
  const [targetFormat, setTargetFormat] = useState<"csv" | "json">("csv");
  const [schemaMode, setSchemaMode] = useState<"standard3" | "enriched">("standard3");
  const [chainChoice, setChainChoice] = useState<"evm" | "solana" | "quantum">("evm");
  const [includeVanity, setIncludeVanity] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [vanityFound, setVanityFound] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Live sampled stream records
  const [streamSamples, setStreamSamples] = useState<StreamSampleRecord[]>(INITIAL_SAMPLE_RECORDS);

  // Selected Target Contract for Artifact Generation
  const [selectedArtifactParams, setSelectedArtifactParams] = useState<StreamArtifactParams>({
    contractAddress: INITIAL_SAMPLE_RECORDS[0].contract_address,
    tokenId: INITIAL_SAMPLE_RECORDS[0].token_id,
    networkId: INITIAL_SAMPLE_RECORDS[0].network_id,
    tokenStandard: INITIAL_SAMPLE_RECORDS[0].token_standard,
    name: "Stream Sovereign Protocol",
    symbol: "SOVSTREAM",
    decimals: 18,
    initialSupply: "1,000,000,000",
    launchStatus: "Deployed",
    deployerAddress: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
  });

  // Custom Contract ID Input State
  const [customContractInput, setCustomContractInput] = useState<string>(
    INITIAL_SAMPLE_RECORDS[0].contract_address
  );
  const [customTokenIdInput, setCustomTokenIdInput] = useState<string>(
    INITIAL_SAMPLE_RECORDS[0].token_id
  );
  const [customNetworkId, setCustomNetworkId] = useState<number>(1);
  const [customStandard, setCustomStandard] = useState<string>("ERC-20");

  const handleApplyCustomContractId = (
    addr: string,
    tokId: string,
    netId: number = 1,
    std: string = "ERC-20"
  ) => {
    setSelectedArtifactParams({
      contractAddress: addr,
      tokenId: tokId || "10000000000000000000000000000001",
      networkId: netId,
      tokenStandard: std,
      name: "Stream Protocol Token",
      symbol: "STREAM",
      decimals: 18,
      initialSupply: "1,000,000,000",
      launchStatus: "Deployed",
      deployerAddress: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
    });
    setCustomContractInput(addr);
    setCustomTokenIdInput(tokId);
    setCustomNetworkId(netId);
    setCustomStandard(std);
    setActiveEngineMode("artifacts");
  };

  const startStreaming = async () => {
    setIsStreaming(true);
    setProgress(0);
    setVanityFound(0);
    setIsCompleted(false);
    setDownloadUrl(null);

    const startTime = performance.now();
    const chunkSize = 25000;
    let accumulated = 0;
    let totalVanity = 0;
    const parts: string[] = [];
    const newSamples: StreamSampleRecord[] = [];

    if (targetFormat === "csv") {
      if (schemaMode === "standard3") {
        parts.push("contract_address,token_id,network_id\n");
      } else {
        parts.push("contract_address,token_id,network_id,token_standard,launch_status,is_vanity\n");
      }
    } else {
      parts.push("[\n");
    }

    const enterprisePrefixes = [
      "00000",
      "5AFE",
      "C0RP",
      "1967",
      "2535",
      "4337",
      "DE90",
      "ACCE",
      "BA5E",
      "8888",
      "7777",
      "000",
    ];
    const standards = [
      "Enterprise ERC-20 Proxy",
      "Enterprise ERC-721",
      "Enterprise ERC-1155",
      "Enterprise Quantum-Hybrid",
    ];
    const statuses = ["Deployed", "Audited", "Paused", "Liquidity Locked"];

    const runChunk = () => {
      const currentChunk = Math.min(chunkSize, targetCount - accumulated);
      let chunkStr = "";

      for (let i = 0; i < currentChunk; i++) {
        const isVanity = includeVanity && Math.random() < 0.05; // 5% Vanity
        if (isVanity) totalVanity++;

        let addr = "";

        if (chainChoice === "solana") {
          addr = isVanity ? "Corp" + generateBase58(40) : "Safe" + generateBase58(40);
        } else if (chainChoice === "quantum") {
          addr = "0xQ" + (isVanity ? "C0RP" : "5AFE") + generateRandomHex(36);
        } else {
          const pref = isVanity
            ? enterprisePrefixes[Math.floor(Math.random() * enterprisePrefixes.length)].toLowerCase()
            : ["0000", "000", "00", "5afe", "c0rp", "1967", "2535"][Math.floor(Math.random() * 7)];
          addr = "0x" + pref + generateRandomHex(40 - pref.length);
        }

        // Generate full uint256 token ID (BigInt string representation)
        const randHex = generateRandomHex(32);
        const tokenId = BigInt("0x" + randHex).toString();

        const stdRand = Math.random();
        let standard = "ERC-20";
        if (stdRand < 0.6) standard = "ERC-20";
        else if (stdRand < 0.8) standard = "ERC-721";
        else if (stdRand < 0.9) standard = "ERC-1155";
        else standard = "Quantum-Hybrid";

        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Collect samples for the interactive inspector
        if (newSamples.length < 30 && Math.random() < 0.08) {
          newSamples.push({
            contract_address: addr,
            token_id: tokenId,
            network_id: 1,
            token_standard: standard,
            launch_status: status,
            is_vanity: isVanity,
          });
        }

        if (targetFormat === "csv") {
          if (schemaMode === "standard3") {
            chunkStr += `${addr},${tokenId},1\n`;
          } else {
            chunkStr += `${addr},${tokenId},1,${standard},${status},${isVanity}\n`;
          }
        } else {
          const isLast = accumulated + i === targetCount - 1;
          if (schemaMode === "standard3") {
            chunkStr += `  {"contract_address":"${addr}","token_id":"${tokenId}","network_id":1}${isLast ? "" : ",\n"}`;
          } else {
            chunkStr += `  {"contract_address":"${addr}","token_id":"${tokenId}","network_id":1,"token_standard":"${standard}","launch_status":"${status}","is_vanity":${isVanity}}${isLast ? "" : ",\n"}`;
          }
        }
      }

      parts.push(chunkStr);
      accumulated += currentChunk;
      setProgress(accumulated);
      setVanityFound(totalVanity);

      if (newSamples.length > 0) {
        setStreamSamples([...newSamples]);
      }

      const elapsed = (performance.now() - startTime) / 1000;
      setSpeed(Math.round(accumulated / (elapsed || 0.001)));

      if (accumulated < targetCount) {
        setTimeout(runChunk, 0);
      } else {
        if (targetFormat === "json") {
          parts.push("\n]");
        }
        const mime = targetFormat === "csv" ? "text/csv" : "application/json";
        const blob = new Blob(parts, { type: `${mime};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsStreaming(false);
        setIsCompleted(true);
      }
    };

    setTimeout(runChunk, 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Engine Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#14151B] border border-[#21232C] rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#F27D26]/15 border border-[#F27D26]/40 text-[#F27D26]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight uppercase font-mono">
              High-Volume Stream Exporter & Artifact Engine
            </h2>
            <p className="text-xs text-[#8E9299]">
              Stream up to 1,000,000 records or inspect any Contract ID to generate Solidity, Bytecode, ABI, Deployment Tx & Proof.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-[#0A0A0E] border border-[#1F1F24] rounded-lg">
          <button
            type="button"
            id="tab-mode-stream-export"
            onClick={() => setActiveEngineMode("stream")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeEngineMode === "stream"
                ? "bg-[#F27D26] text-black shadow-md"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1M Stream Exporter</span>
          </button>

          <button
            type="button"
            id="tab-mode-contract-artifacts"
            onClick={() => setActiveEngineMode("artifacts")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeEngineMode === "artifacts"
                ? "bg-green-500 text-black shadow-md"
                : "text-green-400 hover:text-white"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Contract ID Artifacts & Proof</span>
          </button>
        </div>
      </div>

      {/* MODE 1: STREAM EXPORTER */}
      {activeEngineMode === "stream" && (
        <div className="space-y-6">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1F1F23]">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#F27D26]" />
                  <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                    Streaming Configuration (Up to 1,000,000 IDs)
                  </h3>
                </div>
                <p className="text-xs text-[#8E9299] mt-1">
                  Stream up to 1 million verified contract addresses and uint256 token IDs directly to your browser memory and download as a single file.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-green-500 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23]">
                  Zero Server Uploads • Client-Side Stream
                </span>
              </div>
            </div>

            {/* Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Target Count */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  Target Dataset Size
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {[100000, 500000, 1000000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetCount(num)}
                      disabled={isStreaming}
                      className={`p-2 rounded-lg border font-bold transition-all cursor-pointer ${
                        targetCount === num
                          ? "bg-[#0A0A0C] border-[#F27D26] text-[#F27D26] shadow-sm"
                          : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                      }`}
                    >
                      {(num / 1000000).toFixed(num === 1000000 ? 0 : 1)}M IDs
                    </button>
                  ))}
                </div>
              </div>

              {/* Chain Architecture */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  Chain Standard
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setChainChoice("evm")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium transition-all cursor-pointer ${
                      chainChoice === "evm"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    EVM 0x
                  </button>
                  <button
                    type="button"
                    onClick={() => setChainChoice("solana")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium transition-all cursor-pointer ${
                      chainChoice === "solana"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Solana
                  </button>
                  <button
                    type="button"
                    onClick={() => setChainChoice("quantum")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium transition-all cursor-pointer ${
                      chainChoice === "quantum"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Quantum
                  </button>
                </div>
              </div>

              {/* Schema Mode */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  CSV Columns
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSchemaMode("standard3")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium transition-all cursor-pointer text-[11px] ${
                      schemaMode === "standard3"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    3-Col Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemaMode("enriched")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium transition-all cursor-pointer text-[11px] ${
                      schemaMode === "enriched"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    6-Col Enriched
                  </button>
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  File Format
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetFormat("csv")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      targetFormat === "csv"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFormat("json")}
                    disabled={isStreaming}
                    className={`p-2 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      targetFormat === "json"
                        ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Progress & Trigger Area */}
            <div className="p-5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-[#8E9299] font-mono">
                  Generation Progress:{" "}
                  <span className="text-white font-bold">{progress.toLocaleString()}</span> /{" "}
                  {targetCount.toLocaleString()} (
                  {((progress / targetCount) * 100).toFixed(1)}%)
                </span>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-[#F27D26]">
                    Vanity Matches (0x000/0xACE/0x5AFE):{" "}
                    <span className="font-bold">{vanityFound.toLocaleString()}</span>
                  </span>
                  {isStreaming && (
                    <span className="text-green-500 font-bold animate-pulse">
                      ⚡ {speed.toLocaleString()} IDs/sec
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#16161A] rounded-full overflow-hidden border border-[#1F1F23]">
                <div
                  className="h-full bg-[#F27D26] transition-all duration-75"
                  style={{ width: `${(progress / targetCount) * 100}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-[#E0E0E0]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVanity}
                      onChange={(e) => setIncludeVanity(e.target.checked)}
                      disabled={isStreaming}
                      className="rounded border-[#1F1F23] text-[#F27D26] focus:ring-[#F27D26]"
                    />
                    <span>Include 5% Institutional Vanity Prefixes (0x000, 0x5AFE, 0xC0RP)</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#8E9299]">
                    Schema:{" "}
                    {schemaMode === "standard3"
                      ? "contract_address,token_id,network_id (1)"
                      : "contract_address,token_id,network_id,token_standard,launch_status,is_vanity"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {!isCompleted ? (
                    <button
                      id="btn-start-1m-stream"
                      type="button"
                      onClick={startStreaming}
                      disabled={isStreaming}
                      className="px-6 py-2.5 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isStreaming ? (
                        <>
                          <Cpu className="w-4 h-4 animate-spin" />
                          <span>Streaming Chunks...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-black" />
                          <span>
                            Stream {targetCount.toLocaleString()} {targetFormat.toUpperCase()}
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      id="btn-download-1m-file"
                      href={downloadUrl!}
                      download={`tokens_foundry_${targetCount}_records.${targetFormat}`}
                      className="px-6 py-2.5 rounded bg-green-500 hover:bg-green-400 text-black font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        Download {targetCount.toLocaleString()} {targetFormat.toUpperCase()} File
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Streamed Records Table with 1-Click "Generate 5 Artifacts & Proof" */}
          <div className="bg-[#121318] border border-[#21232C] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2028]">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Sample Streamed Contract Records ({streamSamples.length} Active Records)
                  </h4>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Click any contract ID below to generate its Solidity Source, Bytecode, ABI, Deployment Transaction, and On-Chain Proof.
                </p>
              </div>

              <span className="text-[11px] font-mono text-cyan-400 bg-[#0E1015] px-3 py-1 rounded border border-[#1E2028]">
                Real-Time Memory Buffer
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1C1E26] text-[#8E9299] text-[11px] uppercase">
                    <th className="py-2.5 px-3">Contract Address (Contract ID)</th>
                    <th className="py-2.5 px-3">Token ID (uint256)</th>
                    <th className="py-2.5 px-3">Network</th>
                    <th className="py-2.5 px-3">Standard</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181922]">
                  {streamSamples.map((rec, i) => (
                    <tr key={i} className="hover:bg-[#161820] transition-colors group">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold truncate max-w-[200px] sm:max-w-[260px]">
                            {rec.contract_address}
                          </span>
                          {rec.is_vanity && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30">
                              Vanity
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 truncate max-w-[150px]">
                        {rec.token_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#8E9299]">ID {rec.network_id}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {rec.token_standard}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/15 text-green-400 border border-green-500/30">
                          {rec.launch_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleApplyCustomContractId(
                              rec.contract_address,
                              rec.token_id,
                              rec.network_id,
                              rec.token_standard
                            )
                          }
                          className="px-2.5 py-1 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 hover:border-green-400 text-green-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                          title="Generate Solidity, Bytecode, ABI, Deployment Tx & Proof for this Contract ID"
                        >
                          <FileCode className="w-3.5 h-3.5 text-green-400" />
                          <span>Generate 5 Artifacts & Proof</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CONTRACT ID ARTIFACT & PROOF GENERATOR */}
      {activeEngineMode === "artifacts" && (
        <div className="space-y-6">
          {/* Target Contract ID Custom Input Bar */}
          <div className="p-5 rounded-xl bg-[#14151B] border border-[#21232C] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1E2028]">
              <div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Select or Enter Stream Contract ID
                  </h3>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Input any contract address and token ID exported from the stream to generate the complete on-chain artifact suite.
                </p>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-[11px] text-[#8E9299]">Presets:</span>
                {INITIAL_SAMPLE_RECORDS.slice(0, 3).map((rec, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      handleApplyCustomContractId(
                        rec.contract_address,
                        rec.token_id,
                        rec.network_id,
                        rec.token_standard
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#1C1E26] hover:bg-[#252834] text-[#D4D4D8] border border-[#2B2E3C] text-[10px] cursor-pointer"
                  >
                    {rec.contract_address.slice(0, 8)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[10px] text-[#8E9299] uppercase font-bold block">
                  Contract Address (Contract ID)
                </label>
                <input
                  type="text"
                  value={customContractInput}
                  onChange={(e) => setCustomContractInput(e.target.value)}
                  placeholder="0x5AFE... or 0x000..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0E] border border-[#21232C] focus:border-[#F27D26] text-white text-xs outline-none"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] text-[#8E9299] uppercase font-bold block">
                  Token ID (uint256)
                </label>
                <input
                  type="text"
                  value={customTokenIdInput}
                  onChange={(e) => setCustomTokenIdInput(e.target.value)}
                  placeholder="10000000000000000000000000000001"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0E] border border-[#21232C] focus:border-[#F27D26] text-white text-xs outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  id="btn-apply-contract-id"
                  onClick={() =>
                    handleApplyCustomContractId(
                      customContractInput,
                      customTokenIdInput,
                      customNetworkId,
                      customStandard
                    )
                  }
                  className="w-full py-2 px-3 rounded-lg bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Update Artifacts</span>
                </button>
              </div>
            </div>
          </div>

          {/* Embedded Interactive 5-Artifact Modal & Proof Engine */}
          <StreamContractArtifactModal params={selectedArtifactParams} isEmbedded={true} />
        </div>
      )}
    </div>
  );
};
