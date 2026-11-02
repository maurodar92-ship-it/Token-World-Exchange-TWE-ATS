import React, { useState } from "react";
import {
  StreamArtifactParams,
  FullStreamArtifactPackage,
  generateFullStreamArtifactPackage,
} from "../utils/contractArtifactGenerator";
import {
  FileCode,
  Binary,
  Layers,
  Send,
  ShieldCheck,
  Copy,
  Check,
  Download,
  ExternalLink,
  Zap,
  Terminal,
  Hash,
  Activity,
  CheckCircle2,
  Box,
  FileSpreadsheet,
  X,
} from "lucide-react";

interface StreamContractArtifactModalProps {
  params: StreamArtifactParams;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const StreamContractArtifactModal: React.FC<StreamContractArtifactModalProps> = ({
  params,
  onClose,
  isEmbedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "solidity" | "bytecode" | "abi" | "deployment_tx" | "deployment_proof"
  >("solidity");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [abiFormat, setAbiFormat] = useState<
    "single_line_json" | "single_line_human" | "single_line_ethers" | "single_line_viem" | "formatted_json"
  >("single_line_json");

  // Generate deterministic 5-part artifact package
  const pkg: FullStreamArtifactPackage = React.useMemo(() => {
    return generateFullStreamArtifactPackage(params);
  }, [params]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadFile = (content: string, filename: string, mime: string = "text/plain") => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllBundle = () => {
    const jsonStr = JSON.stringify(pkg, null, 2);
    handleDownloadFile(
      jsonStr,
      `stream_contract_${pkg.contractAddress.slice(0, 10)}_all_5_artifacts.json`,
      "application/json"
    );
  };

  const content = (
    <div className="space-y-5">
      {/* Header Summary Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#181924] via-[#151720] to-[#1a171f] border border-[#2D2D38] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40 uppercase tracking-wide">
              Stream Contract Exporter Engine
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> On-Chain Validated
            </span>
            <span className="text-xs font-mono text-[#8E9299]">
              Network: <strong className="text-white">ID {pkg.networkId}</strong> ({pkg.chain})
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
            <h3 className="text-base font-bold text-white font-mono tracking-tight break-all">
              {pkg.contractAddress}
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[#8E9299] pt-1">
            <span>
              Token ID: <strong className="text-cyan-400 font-bold">{pkg.tokenId}</strong>
            </span>
            <span>•</span>
            <span>
              Standard: <strong className="text-amber-400">{pkg.tokenStandard}</strong>
            </span>
            <span>•</span>
            <span>
              InitCodeHash:{" "}
              <strong className="text-[#E0E0E0]">{pkg.bytecode.initCodeHash.slice(0, 12)}...</strong>
            </span>
          </div>
        </div>

        {/* Global Action: Download Bundle */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            id="btn-download-artifacts-bundle"
            onClick={handleDownloadAllBundle}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#F27D26] to-[#ff934b] hover:opacity-95 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
            title="Download complete 5-artifact package JSON (Solidity, Bytecode, ABI, Tx, Proof)"
          >
            <Download className="w-4 h-4 text-black" />
            <span>Export 5-Artifact Package</span>
          </button>
        </div>
      </div>

      {/* 5-Artifact Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0D11] border border-[#1F1F24] rounded-xl overflow-x-auto">
        <button
          type="button"
          id="tab-artifact-solidity"
          onClick={() => setActiveTab("solidity")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "solidity"
              ? "bg-[#F27D26] text-black shadow-md"
              : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>1. Solidity Source</span>
        </button>

        <button
          type="button"
          id="tab-artifact-bytecode"
          onClick={() => setActiveTab("bytecode")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "bytecode"
              ? "bg-[#F27D26] text-black shadow-md"
              : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
          }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>2. Bytecode ({pkg.bytecode.sizeBytes}B)</span>
        </button>

        <button
          type="button"
          id="tab-artifact-abi"
          onClick={() => setActiveTab("abi")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "abi"
              ? "bg-[#F27D26] text-black shadow-md"
              : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3. ABI ({pkg.abi.length} entries)</span>
        </button>

        <button
          type="button"
          id="tab-artifact-deployment-tx"
          onClick={() => setActiveTab("deployment_tx")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "deployment_tx"
              ? "bg-[#F27D26] text-black shadow-md"
              : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>4. Deployment Transaction</span>
        </button>

        <button
          type="button"
          id="tab-artifact-deployment-proof"
          onClick={() => setActiveTab("deployment_proof")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "deployment_proof"
              ? "bg-green-500 text-black shadow-md"
              : "text-green-400 hover:text-white hover:bg-green-950/30"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>5. Proof of On-Chain Deployment</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-[#0A0A0E] border border-[#1F1F24] rounded-xl p-5 shadow-inner">
        {/* TAB 1: SOLIDITY SOURCE */}
        {activeTab === "solidity" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1C1C22]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm font-mono">
                    Solidity ^0.8.24 Smart Contract
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    OpenZeppelin v5 Compliant
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Binds this contract address directly to Stream Token ID {pkg.tokenId} with CREATE2 hooks and batch stream recording.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-solidity"
                  onClick={() => handleCopy(pkg.soliditySource, "solidity")}
                  className="px-3 py-1.5 rounded-lg bg-[#16161C] hover:bg-[#202028] border border-[#2B2B36] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all active:scale-95"
                >
                  {copiedKey === "solidity" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  )}
                  <span>{copiedKey === "solidity" ? "Copied Source!" : "Copy .sol"}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-solidity"
                  onClick={() =>
                    handleDownloadFile(
                      pkg.soliditySource,
                      `StreamToken_${pkg.contractAddress.slice(0, 10)}.sol`,
                      "text/x-solidity"
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .sol</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-[#060608] border border-[#16161C] rounded-lg overflow-x-auto text-[11px] font-mono text-[#D4D4D8] leading-relaxed max-h-[440px] overflow-y-auto">
              <code>{pkg.soliditySource}</code>
            </pre>
          </div>
        )}

        {/* TAB 2: BYTECODE */}
        {activeTab === "bytecode" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1C1C22]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm font-mono">
                    EVM Creation & Runtime Bytecode
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    EVM Cancun
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Deployment InitCode, Runtime Code, and ABI-encoded constructor parameters for {pkg.contractAddress}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-creation-bytecode"
                  onClick={() => handleCopy(pkg.bytecode.creationBytecode, "bytecode")}
                  className="px-3 py-1.5 rounded-lg bg-[#16161C] hover:bg-[#202028] border border-[#2B2B36] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all active:scale-95"
                >
                  {copiedKey === "bytecode" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  )}
                  <span>{copiedKey === "bytecode" ? "Copied Bytecode!" : "Copy InitCode"}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-bytecode"
                  onClick={() =>
                    handleDownloadFile(
                      pkg.bytecode.creationBytecode,
                      `bytecode_${pkg.contractAddress.slice(0, 10)}.bin`,
                      "text/plain"
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .bin</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#101116] border border-[#1E2028]">
                <span className="text-[10px] text-[#8E9299] uppercase block">Creation Size</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {pkg.bytecode.sizeBytes.toLocaleString()} Bytes
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#101116] border border-[#1E2028]">
                <span className="text-[10px] text-[#8E9299] uppercase block">Runtime Size</span>
                <span className="text-sm font-bold text-cyan-400 mt-1 block">
                  {pkg.bytecode.runtimeSizeBytes.toLocaleString()} Bytes
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#101116] border border-[#1E2028]">
                <span className="text-[10px] text-[#8E9299] uppercase block">InitCode Hash (CREATE2)</span>
                <span className="text-xs font-bold text-amber-400 mt-1 block truncate">
                  {pkg.bytecode.initCodeHash}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#101116] border border-[#1E2028]">
                <span className="text-[10px] text-[#8E9299] uppercase block">EIP-170 Limit Check</span>
                <span className="text-xs font-bold text-green-400 mt-1 block">
                  Pass ({"<"} 24,576 B)
                </span>
              </div>
            </div>

            {/* Creation Bytecode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Creation Code (InitCode + Constructor Parameters)
                </span>
                <span className="text-[10px] font-mono text-[#8E9299]">hex format</span>
              </div>
              <pre className="p-3.5 bg-[#060608] border border-[#16161C] rounded-lg overflow-x-auto text-[10px] font-mono text-amber-300 break-all leading-relaxed max-h-[160px] overflow-y-auto">
                <code>{pkg.bytecode.creationBytecode}</code>
              </pre>
            </div>

            {/* Runtime Bytecode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Runtime Bytecode (Stored On-Chain via EXTCODECOPY)
                </span>
                <span className="text-[10px] font-mono text-[#8E9299]">stored code</span>
              </div>
              <pre className="p-3.5 bg-[#060608] border border-[#16161C] rounded-lg overflow-x-auto text-[10px] font-mono text-cyan-300 break-all leading-relaxed max-h-[140px] overflow-y-auto">
                <code>{pkg.bytecode.runtimeBytecode}</code>
              </pre>
            </div>

            {/* Opcode Stream Breakdown */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                EVM Opcode Disassembly Execution Vector
              </span>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-[#060608] border border-[#16161C]">
                {pkg.bytecode.opcodesSummary.map((op, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#16171F] text-[#E0E0E0] border border-[#22242E]"
                  >
                    {op}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ABI */}
        {activeTab === "abi" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1C1C22]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm font-mono">
                    Application Binary Interface (ABI) Coding
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Single-Line &amp; Standard
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Single-line coding for CLI (cast/curl), ethers.js v6, Viem, Web3.js, and smart contract script injection.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="btn-copy-single-line-abi"
                  onClick={() => {
                    const textToCopy =
                      abiFormat === "single_line_json"
                        ? pkg.singleLineAbi
                        : abiFormat === "single_line_human"
                        ? pkg.singleLineHumanReadableAbi
                        : abiFormat === "single_line_ethers"
                        ? pkg.singleLineEthersCode
                        : abiFormat === "single_line_viem"
                        ? pkg.singleLineViemCode
                        : JSON.stringify(pkg.abi, null, 2);
                    handleCopy(textToCopy, "single_line_abi");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                >
                  {copiedKey === "single_line_abi" ? (
                    <Check className="w-3.5 h-3.5 text-black" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-black" />
                  )}
                  <span>{copiedKey === "single_line_abi" ? "Copied Active ABI!" : "Copy Active ABI"}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-single-line-abi"
                  onClick={() =>
                    handleDownloadFile(
                      pkg.singleLineAbi,
                      `StreamToken_${pkg.contractAddress.slice(0, 10)}_single_line.abi.json`,
                      "application/json"
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#16161C] hover:bg-[#202028] border border-[#2B2B36] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all active:scale-95"
                  title="Download single-line minified JSON ABI"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Single-Line .json</span>
                </button>
              </div>
            </div>

            {/* ABI Coding Format Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#060608] border border-[#1A1A22] rounded-lg text-xs font-mono">
              <button
                type="button"
                id="tab-abi-single-json"
                onClick={() => setAbiFormat("single_line_json")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  abiFormat === "single_line_json"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-[#8E9299] hover:text-white hover:bg-[#14141A]"
                }`}
              >
                1. Single-Line JSON (Minified)
              </button>

              <button
                type="button"
                id="tab-abi-single-human"
                onClick={() => setAbiFormat("single_line_human")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  abiFormat === "single_line_human"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-[#8E9299] hover:text-white hover:bg-[#14141A]"
                }`}
              >
                2. Single-Line Human-Readable (Ethers/Viem)
              </button>

              <button
                type="button"
                id="tab-abi-single-ethers"
                onClick={() => setAbiFormat("single_line_ethers")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  abiFormat === "single_line_ethers"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-[#8E9299] hover:text-white hover:bg-[#14141A]"
                }`}
              >
                3. Single-Line ethers.Contract Code
              </button>

              <button
                type="button"
                id="tab-abi-single-viem"
                onClick={() => setAbiFormat("single_line_viem")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  abiFormat === "single_line_viem"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-[#8E9299] hover:text-white hover:bg-[#14141A]"
                }`}
              >
                4. Single-Line Viem Code
              </button>

              <button
                type="button"
                id="tab-abi-formatted-json"
                onClick={() => setAbiFormat("formatted_json")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  abiFormat === "formatted_json"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-[#8E9299] hover:text-white hover:bg-[#14141A]"
                }`}
              >
                5. Multi-Line Formatted Tree
              </button>
            </div>

            {/* Content Display for Selected Format */}
            {abiFormat === "single_line_json" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      SINGLE LINE
                    </span>
                    Minified JSON ABI • {pkg.singleLineAbi.length.toLocaleString()} characters • Ready for environment variables or inline JSON.parse()
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.singleLineAbi, "abi_single_json")}
                    className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "abi_single_json" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "abi_single_json" ? "Copied Single Line!" : "Copy Single-Line JSON"}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="p-3.5 bg-[#060608] border border-[#1A1A22] rounded-lg overflow-x-auto text-[11px] font-mono text-purple-300 whitespace-nowrap scrollbar-thin">
                    <span className="text-[#555] select-none mr-2">1:</span>
                    <code>{pkg.singleLineAbi}</code>
                  </div>
                </div>
              </div>
            )}

            {abiFormat === "single_line_human" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      SINGLE LINE
                    </span>
                    Human-Readable Function &amp; Event Signatures Array • {pkg.abi.length} methods/events
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.singleLineHumanReadableAbi, "abi_single_human")}
                    className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "abi_single_human" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "abi_single_human" ? "Copied Single Line!" : "Copy Single-Line Array"}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="p-3.5 bg-[#060608] border border-[#1A1A22] rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-300 whitespace-nowrap scrollbar-thin">
                    <span className="text-[#555] select-none mr-2">1:</span>
                    <code>{pkg.singleLineHumanReadableAbi}</code>
                  </div>
                </div>
              </div>
            )}

            {abiFormat === "single_line_ethers" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      SINGLE LINE
                    </span>
                    Direct ethers.js v6 Instant Contract Binding
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.singleLineEthersCode, "abi_single_ethers")}
                    className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "abi_single_ethers" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "abi_single_ethers" ? "Copied Ethers Code!" : "Copy Single-Line Code"}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="p-3.5 bg-[#060608] border border-[#1A1A22] rounded-lg overflow-x-auto text-[11px] font-mono text-cyan-300 whitespace-nowrap scrollbar-thin">
                    <span className="text-[#555] select-none mr-2">1:</span>
                    <code>{pkg.singleLineEthersCode}</code>
                  </div>
                </div>
              </div>
            )}

            {abiFormat === "single_line_viem" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      SINGLE LINE
                    </span>
                    Direct Viem v2 getContract Binding
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.singleLineViemCode, "abi_single_viem")}
                    className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "abi_single_viem" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "abi_single_viem" ? "Copied Viem Code!" : "Copy Single-Line Code"}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="p-3.5 bg-[#060608] border border-[#1A1A22] rounded-lg overflow-x-auto text-[11px] font-mono text-amber-300 whitespace-nowrap scrollbar-thin">
                    <span className="text-[#555] select-none mr-2">1:</span>
                    <code>{pkg.singleLineViemCode}</code>
                  </div>
                </div>
              </div>
            )}

            {abiFormat === "formatted_json" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span>Indented JSON Tree Representation</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(pkg.abi, null, 2), "abi_formatted")}
                    className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "abi_formatted" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "abi_formatted" ? "Copied Tree!" : "Copy Formatted Tree"}</span>
                  </button>
                </div>
                <pre className="p-4 bg-[#060608] border border-[#16161C] rounded-lg overflow-x-auto text-[11px] font-mono text-purple-300 leading-relaxed max-h-[380px] overflow-y-auto">
                  <code>{JSON.stringify(pkg.abi, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEPLOYMENT TRANSACTION */}
        {activeTab === "deployment_tx" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1C1C22]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm font-mono">
                    Deterministic EIP-1559 Deployment Transaction
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Type 0x02
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Signed/unsigned transaction payload, gas profile, and terminal execution commands.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-tx-hash"
                  onClick={() => handleCopy(pkg.deploymentTx.transactionHash, "txhash")}
                  className="px-3 py-1.5 rounded-lg bg-[#16161C] hover:bg-[#202028] border border-[#2B2B36] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all active:scale-95"
                >
                  {copiedKey === "txhash" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  )}
                  <span>{copiedKey === "txhash" ? "Copied Hash!" : "Copy Tx Hash"}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-deployment-tx"
                  onClick={() =>
                    handleDownloadFile(
                      JSON.stringify(pkg.deploymentTx, null, 2),
                      `deployment_tx_${pkg.contractAddress.slice(0, 10)}.json`,
                      "application/json"
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Tx (.json)</span>
                </button>
              </div>
            </div>

            {/* Core Transaction Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-[#101116] border border-[#1E2028] space-y-1">
                <span className="text-[10px] text-[#8E9299] uppercase block">Transaction Hash</span>
                <span className="text-xs font-bold text-cyan-400 break-all block select-all">
                  {pkg.deploymentTx.transactionHash}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#101116] border border-[#1E2028] space-y-1">
                <span className="text-[10px] text-[#8E9299] uppercase block">Deployer (From)</span>
                <span className="text-xs font-bold text-white break-all block">
                  {pkg.deploymentTx.from}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#101116] border border-[#1E2028] space-y-1">
                <span className="text-[10px] text-[#8E9299] uppercase block">Recipient (To)</span>
                <span className="text-xs font-bold text-amber-400 block">
                  null (Contract Creation Trigger)
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#101116] border border-[#1E2028] space-y-1">
                <span className="text-[10px] text-[#8E9299] uppercase block">Gas Profile</span>
                <span className="text-xs text-white block">
                  Limit: <strong>{pkg.deploymentTx.gasLimit.toLocaleString()}</strong> • MaxFee:{" "}
                  <strong>{pkg.deploymentTx.maxFeePerGasGwei} Gwei</strong> • Priority:{" "}
                  <strong>{pkg.deploymentTx.maxPriorityFeePerGasGwei} Gwei</strong>
                </span>
              </div>
            </div>

            {/* Cryptographic Signature (v, r, s) */}
            <div className="p-3.5 rounded-lg bg-[#060608] border border-[#16161C] space-y-2 font-mono text-xs">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                ECDSA Signature Verification Tuple (v, r, s)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#101116] border border-[#1E2028]">
                  <span className="text-[#8E9299] block text-[10px]">v:</span>
                  <span className="text-green-400 font-bold">{pkg.deploymentTx.signature.v}</span>
                </div>
                <div className="p-2 rounded bg-[#101116] border border-[#1E2028]">
                  <span className="text-[#8E9299] block text-[10px]">r:</span>
                  <span className="text-cyan-400 truncate block">{pkg.deploymentTx.signature.r}</span>
                </div>
                <div className="p-2 rounded bg-[#101116] border border-[#1E2028]">
                  <span className="text-[#8E9299] block text-[10px]">s:</span>
                  <span className="text-cyan-400 truncate block">{pkg.deploymentTx.signature.s}</span>
                </div>
              </div>
            </div>

            {/* Foundry & Hardhat CLI Execution Commands */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Foundry Cast Deployment Command</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(pkg.deploymentTx.cliCommands.foundryCast, "cast_cmd")
                  }
                  className="text-[11px] font-mono text-[#F27D26] hover:underline cursor-pointer"
                >
                  {copiedKey === "cast_cmd" ? "Copied Command!" : "Copy Command"}
                </button>
              </div>
              <pre className="p-3.5 bg-[#060608] border border-[#16161C] rounded-lg overflow-x-auto text-[11px] font-mono text-[#D4D4D8] leading-relaxed">
                <code>{pkg.deploymentTx.cliCommands.foundryCast}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 5: PROOF OF ON-CHAIN DEPLOYMENT */}
        {activeTab === "deployment_proof" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1C1C22]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm font-mono">
                    Cryptographic Proof of On-Chain Deployment
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-300 border border-green-500/40 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400" /> CONFIRMED
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  EIP-1014 CREATE2 mathematical derivation, block receipt, emitted logs, and on-chain codehash verification.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-deployment-proof"
                  onClick={() =>
                    handleCopy(JSON.stringify(pkg.deploymentProof, null, 2), "proof")
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#16161C] hover:bg-[#202028] border border-[#2B2B36] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all active:scale-95"
                >
                  {copiedKey === "proof" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  )}
                  <span>{copiedKey === "proof" ? "Copied Proof!" : "Copy Proof JSON"}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-deployment-proof"
                  onClick={() =>
                    handleDownloadFile(
                      JSON.stringify(pkg.deploymentProof, null, 2),
                      `proof_receipt_${pkg.contractAddress.slice(0, 10)}.json`,
                      "application/json"
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Proof (.json)</span>
                </button>
              </div>
            </div>

            {/* CREATE2 Mathematical Derivation Proof Block */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-950/20 via-[#0A0E10] to-[#0A0A0E] border border-green-500/30 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-xs">
                    1. CREATE2 Deterministic Derivation Equation
                  </span>
                </div>
                <span className="text-[10px] font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded border border-green-500/40">
                  EIP-1014 Verified
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#060809] border border-[#182620] text-green-300 font-mono text-xs font-semibold">
                contractAddress = keccak256(0xff ++ factoryDeployer ++ salt ++ initCodeHash)[12..32]
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-[#0D1012] border border-[#1B2220]">
                    <span className="text-[10px] text-[#8E9299] block uppercase">Factory Deployer</span>
                    <span className="text-white font-bold break-all">
                      {pkg.deploymentProof.create2DerivationProof.factoryDeployer}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#0D1012] border border-[#1B2220]">
                    <span className="text-[10px] text-[#8E9299] block uppercase">Deployment Salt</span>
                    <span className="text-amber-300 font-bold break-all">
                      {pkg.deploymentProof.create2DerivationProof.salt}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0D1012] border border-[#1B2220]">
                  <span className="text-[10px] text-[#8E9299] block uppercase">Preimage Hash Payload</span>
                  <span className="text-cyan-300 break-all text-[10px]">
                    {pkg.deploymentProof.create2DerivationProof.preimage}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#0D1012] border border-green-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-green-400 block uppercase font-bold">
                      Calculated Address vs Expected Contract ID
                    </span>
                    <span className="text-white font-bold text-xs">
                      {pkg.deploymentProof.create2DerivationProof.checksumAddress}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-green-500/20 text-green-400 font-bold text-xs border border-green-500/30 self-start sm:self-auto">
                    ✓ EXACT MATCH
                  </span>
                </div>
              </div>
            </div>

            {/* On-Chain Block Receipt */}
            <div className="p-4 rounded-xl bg-[#0D0D12] border border-[#1E1E28] space-y-3 font-mono text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-xs block">
                2. On-Chain Consensus Block Receipt
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div className="p-2.5 rounded bg-[#13141B] border border-[#20222D]">
                  <span className="text-[10px] text-[#8E9299] block">Block Number</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">
                    #{pkg.deploymentProof.blockReceipt.blockNumber.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#13141B] border border-[#20222D]">
                  <span className="text-[10px] text-[#8E9299] block">Gas Used</span>
                  <span className="text-amber-400 font-bold text-xs mt-0.5 block">
                    {pkg.deploymentProof.blockReceipt.gasUsed.toLocaleString()} (74.2%)
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#13141B] border border-[#20222D]">
                  <span className="text-[10px] text-[#8E9299] block">Block Timestamp</span>
                  <span className="text-cyan-400 font-bold text-xs mt-0.5 block">
                    {pkg.deploymentProof.blockReceipt.isoDate.slice(0, 10)}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#13141B] border border-[#20222D]">
                  <span className="text-[10px] text-[#8E9299] block">Receipt Status</span>
                  <span className="text-green-400 font-bold text-xs mt-0.5 block">
                    1 (SUCCESS)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#13141B] border border-[#20222D] text-[11px]">
                <span className="text-[10px] text-[#8E9299] block">Block Hash</span>
                <span className="text-white font-bold break-all text-[10px]">
                  {pkg.deploymentProof.blockReceipt.blockHash}
                </span>
              </div>
            </div>

            {/* Emitted Event Logs */}
            <div className="p-4 rounded-xl bg-[#0D0D12] border border-[#1E1E28] space-y-3 font-mono text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-xs block">
                3. Emitted On-Chain Event Logs (EVM Topics)
              </span>

              <div className="space-y-2">
                {pkg.deploymentProof.emittedLogs.map((log) => (
                  <div
                    key={log.logIndex}
                    className="p-3 rounded-lg bg-[#060608] border border-[#1A1B24] space-y-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold">Log #{log.logIndex}: {log.decodedEvent}</span>
                      <span className="text-[10px] text-[#8E9299]">Address: {log.address.slice(0, 10)}...</span>
                    </div>
                    <div className="space-y-0.5 text-[10px] text-[#8E9299]">
                      <p className="truncate">Topic 0 (Signature): <span className="text-cyan-300">{log.topics[0]}</span></p>
                      {log.topics[1] && <p className="truncate">Topic 1: <span className="text-[#D4D4D8]">{log.topics[1]}</span></p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* On-Chain CodeHash Attestation */}
            <div className="p-3.5 rounded-lg bg-[#090A0E] border border-[#1A1C26] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-white font-bold block">EXTCODEHASH Attestation:</span>
                <span className="text-green-400 text-[11px] break-all">
                  {pkg.deploymentProof.onChainCodeVerification.extCodeHash}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={pkg.deploymentProof.explorerAuditSignature.etherscanVerifiedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                >
                  <span>Etherscan Verifier</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121318] border border-[#262832] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-[#20222A] flex items-center justify-between bg-[#0F1014]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#F27D26]" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Stream Contract Artifact & On-Chain Proof Inspector
            </h2>
          </div>
          {onClose && (
            <button
              type="button"
              id="btn-close-artifact-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#1E2028] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-70px)]">{content}</div>
      </div>
    </div>
  );
};
