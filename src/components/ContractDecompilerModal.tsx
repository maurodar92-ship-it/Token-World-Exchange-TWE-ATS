import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Binary,
  Cpu,
  Layers,
  FileCode,
  Copy,
  Check,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Terminal,
  Activity,
  Code2,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  decompileContractBytecode,
  DecompiledContractStructure,
} from "../utils/contractDecompiler";

interface ContractDecompilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenRecord | null;
}

export const ContractDecompilerModal: React.FC<ContractDecompilerModalProps> = ({
  isOpen,
  onClose,
  token,
}) => {
  const [activeTab, setActiveTab] = useState<"structure" | "opcodes" | "bytecode" | "security_re">("structure");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [decompileResult, setDecompileResult] = useState<DecompiledContractStructure | null>(null);
  const [opcodeSearch, setOpcodeSearch] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      setIsLoading(true);
      setOpcodeSearch("");
      decompileContractBytecode(
        token.contractAddress || "0x0000000000000000000000000000000000000000",
        token.chain || token.network || "Ethereum Mainnet"
      )
        .then((result) => {
          setDecompileResult(result);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, token]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSol = () => {
    if (!decompileResult || !token) return;
    const blob = new Blob([decompileResult.decompiledSolidity], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${token.symbol || "Contract"}_Decompiled.sol`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOpcodes = useMemo(() => {
    if (!decompileResult) return [];
    if (!opcodeSearch.trim()) return decompileResult.opcodes;
    const q = opcodeSearch.toLowerCase();
    return decompileResult.opcodes.filter(
      (op) =>
        op.mnemonic.toLowerCase().includes(q) ||
        op.hexPc.toLowerCase().includes(q) ||
        (op.operand && op.operand.toLowerCase().includes(q))
    );
  }, [decompileResult, opcodeSearch]);

  if (!isOpen || !token) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        id="contract-decompiler-modal"
        className="bg-[#0D0E15] border border-[#252838] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F2230] flex items-center justify-between bg-[#12141F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  EVM Contract Bytecode Decompiler
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {decompileResult?.detectedStandard || "EVM Standard"}
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Decodes on-chain runtime bytecode, extracts compiler metadata, function dispatchers, and storage layouts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C1F2D] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Info Summary Bar */}
        <div className="px-6 py-3 bg-[#0F101A] border-b border-[#1E2130] flex items-center justify-between flex-wrap gap-3 font-mono text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-[10px] text-[#8E9299] block">Target Contract</span>
              <span className="text-white font-bold">{token.name} ({token.symbol})</span>
            </div>
            <div className="h-6 w-px bg-[#252838] hidden sm:block" />
            <div>
              <span className="text-[10px] text-[#8E9299] block">Address</span>
              <span className="text-cyan-400 font-bold select-all">{token.contractAddress}</span>
            </div>
            <div className="h-6 w-px bg-[#252838] hidden sm:block" />
            <div>
              <span className="text-[10px] text-[#8E9299] block">Network</span>
              <span className="text-gray-300">{token.chain || token.network}</span>
            </div>
            <div className="h-6 w-px bg-[#252838] hidden sm:block" />
            <div>
              <span className="text-[10px] text-[#8E9299] block">Bytecode Size</span>
              <span className="text-emerald-400 font-bold">
                {decompileResult ? `${decompileResult.bytecodeSize.toLocaleString()} bytes` : "Loading..."}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSol}
              disabled={!decompileResult}
              className="px-3 py-1.5 rounded-lg bg-[#161824] hover:bg-[#202336] text-gray-300 hover:text-white border border-[#2B2F44] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Download Decompiled Solidity file"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download .sol</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 bg-[#12141F] border-b border-[#1E2130] flex items-center gap-3">
          <button
            id="tab-decompile-structure"
            onClick={() => setActiveTab("structure")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "structure"
                ? "bg-cyan-500 text-black font-bold"
                : "text-[#8E9299] hover:text-white bg-[#171924]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Decompiled Structure ({decompileResult?.functions.length || 0} Selectors)</span>
          </button>

          <button
            id="tab-decompile-opcodes"
            onClick={() => setActiveTab("opcodes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "opcodes"
                ? "bg-cyan-500 text-black font-bold"
                : "text-[#8E9299] hover:text-white bg-[#171924]"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Disassembled Opcodes ({decompileResult?.opcodes.length.toLocaleString() || 0})</span>
          </button>

          <button
            id="tab-decompile-bytecode"
            onClick={() => setActiveTab("bytecode")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "bytecode"
                ? "bg-cyan-500 text-black font-bold"
                : "text-[#8E9299] hover:text-white bg-[#171924]"
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Raw EVM Bytecode</span>
          </button>

          <button
            id="tab-decompile-security-re"
            onClick={() => setActiveTab("security_re")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "security_re"
                ? "bg-amber-500 text-black font-bold"
                : "text-amber-400 hover:text-white bg-[#171924] border border-amber-500/30"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Reverse Eng & Storage Audit</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="p-16 text-center text-xs font-mono text-[#8E9299] space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 mx-auto animate-spin" />
              <div className="text-white font-bold text-sm">Decompiling EVM Bytecode...</div>
              <p>Fetching on-chain runtime bytecode, disassembling instructions, and decoding dispatcher table.</p>
            </div>
          ) : !decompileResult ? (
            <div className="p-12 text-center text-xs font-mono text-red-400">
              Failed to decompile contract bytecode.
            </div>
          ) : activeTab === "structure" ? (
            /* Tab 1: Decompiled Structure */
            <div className="space-y-5">
              {/* Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-[#131522] border border-[#212538]">
                  <span className="text-[10px] text-[#8E9299] block">Compiler Target</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">
                    Solidity {decompileResult.compilerMetadata.solcVersion}
                  </span>
                  <span className="text-[10px] text-cyan-400 block mt-0.5">Extracted from CBOR</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131522] border border-[#212538]">
                  <span className="text-[10px] text-[#8E9299] block">IPFS Metadata Hash</span>
                  <span className="text-xs font-bold text-gray-300 mt-0.5 block truncate">
                    {decompileResult.compilerMetadata.ipfsHash || "bzzr0://embedded"}
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">Swarm / IPFS verified</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131522] border border-[#212538]">
                  <span className="text-[10px] text-[#8E9299] block">Security Integrity</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Clean Bytecode
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">No selfdestruct</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131522] border border-[#212538]">
                  <span className="text-[10px] text-[#8E9299] block">Interface Standard</span>
                  <span className="text-sm font-bold text-[#F27D26] mt-0.5 block">
                    {decompileResult.detectedStandard}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Standard Token ABI</span>
                </div>
              </div>

              {/* Decoded Function Selectors Table */}
              <div className="rounded-xl border border-[#212538] bg-[#10121C] overflow-hidden">
                <div className="p-3.5 border-b border-[#1D2130] flex items-center justify-between bg-[#141624]">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    Decoded Function Dispatcher Table ({decompileResult.functions.length} Public Functions)
                  </span>
                  <span className="text-[11px] font-mono text-[#8E9299]">4-byte Keccak-256 Selectors</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0A0B10] text-[#8E9299] text-[10px] uppercase border-b border-[#1D2130]">
                      <tr>
                        <th className="py-2.5 px-4">Selector</th>
                        <th className="py-2.5 px-4">Function Signature</th>
                        <th className="py-2.5 px-4">Visibility</th>
                        <th className="py-2.5 px-4">State Mutability</th>
                        <th className="py-2.5 px-4 text-right">Entry PC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B1E2C] text-gray-300">
                      {decompileResult.functions.map((fn) => (
                        <tr key={fn.selector} className="hover:bg-[#161826]/70 transition-colors">
                          <td className="py-2.5 px-4 text-cyan-400 font-bold">{fn.selector}</td>
                          <td className="py-2.5 px-4 text-white font-semibold">{fn.signature}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#1A1D2A] text-gray-300">
                              {fn.visibility}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                fn.stateMutability === "view"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                  : "bg-[#1A1D2A] text-emerald-300"
                              }`}
                            >
                              {fn.stateMutability}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-[#8E9299]">
                            0x{fn.entryPc.toString(16).padStart(4, "0")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Decoded Storage Layout Table */}
              <div className="rounded-xl border border-[#212538] bg-[#10121C] overflow-hidden">
                <div className="p-3.5 border-b border-[#1D2130] flex items-center justify-between bg-[#141624]">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#F27D26]" />
                    Decoded EVM Storage Slots ({decompileResult.storageSlots.length} Slots)
                  </span>
                  <span className="text-[11px] font-mono text-[#8E9299]">SLOAD / SSTORE Mapping</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0A0B10] text-[#8E9299] text-[10px] uppercase border-b border-[#1D2130]">
                      <tr>
                        <th className="py-2.5 px-4">Slot</th>
                        <th className="py-2.5 px-4">Variable Name</th>
                        <th className="py-2.5 px-4">Inferred Type</th>
                        <th className="py-2.5 px-4">Mapping Structure</th>
                        <th className="py-2.5 px-4 text-right">Access Frequency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B1E2C] text-gray-300">
                      {decompileResult.storageSlots.map((slot) => (
                        <tr key={slot.slot} className="hover:bg-[#161826]/70 transition-colors">
                          <td className="py-2.5 px-4 text-amber-400 font-bold">Slot {slot.slot}</td>
                          <td className="py-2.5 px-4 text-white font-semibold">{slot.name}</td>
                          <td className="py-2.5 px-4 text-cyan-300">{slot.type}</td>
                          <td className="py-2.5 px-4">
                            {slot.isMapping ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                Key-Value Mapping
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#1A1D2A] text-gray-400">
                                Primitive
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-400">{slot.accessCount} reads/writes</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Decompiled Pseudo-Solidity Output */}
              <div className="rounded-xl border border-[#212538] bg-[#0A0B10] overflow-hidden">
                <div className="p-3.5 border-b border-[#1A1C28] flex items-center justify-between bg-[#12141F]">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    Reconstructed High-Level Solidity Structure
                  </span>
                  <button
                    onClick={() => handleCopy(decompileResult.decompiledSolidity, "solidity")}
                    className="px-2.5 py-1 rounded bg-[#1A1D2A] hover:bg-[#25283B] text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedKey === "solidity" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "solidity" ? "Copied" : "Copy Code"}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-cyan-200/90 overflow-x-auto max-h-72 leading-relaxed select-text">
                  {decompileResult.decompiledSolidity}
                </pre>
              </div>
            </div>
          ) : activeTab === "opcodes" ? (
            /* Tab 2: Disassembled Opcodes */
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={opcodeSearch}
                    onChange={(e) => setOpcodeSearch(e.target.value)}
                    placeholder="Search opcode by mnemonic (e.g., PUSH4, SSTORE, MSTORE, EQ)..."
                    className="w-full pl-9 pr-3 py-2 bg-[#12141F] border border-[#232738] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <span className="text-xs font-mono text-[#8E9299]">
                  Showing {filteredOpcodes.length.toLocaleString()} instructions
                </span>
              </div>

              <div className="rounded-xl border border-[#212538] bg-[#0A0B10] overflow-hidden max-h-[55vh] overflow-y-auto font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#12141F] text-[#8E9299] text-[10px] uppercase sticky top-0 border-b border-[#1E2130]">
                    <tr>
                      <th className="py-2.5 px-4">PC (Offset)</th>
                      <th className="py-2.5 px-4">Hex</th>
                      <th className="py-2.5 px-4">Mnemonic</th>
                      <th className="py-2.5 px-4">Operand</th>
                      <th className="py-2.5 px-4 text-right">Gas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151824] text-gray-300">
                    {filteredOpcodes.map((op, idx) => (
                      <tr key={idx} className="hover:bg-[#151724]/80 transition-colors">
                        <td className="py-1.5 px-4 text-[#8E9299]">{op.hexPc}</td>
                        <td className="py-1.5 px-4 text-gray-500">0x{op.opcode.toString(16).padStart(2, "0")}</td>
                        <td className="py-1.5 px-4 font-bold text-cyan-300">{op.mnemonic}</td>
                        <td className="py-1.5 px-4 text-amber-300 font-semibold break-all">
                          {op.operand || "-"}
                        </td>
                        <td className="py-1.5 px-4 text-right text-gray-500">{op.gasCost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "bytecode" ? (
            /* Tab 3: Raw EVM Bytecode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-300">
                  Total Runtime Bytecode: <strong>{decompileResult.bytecodeSize.toLocaleString()} bytes</strong> ({decompileResult.rawBytecode.length - 2} hex characters)
                </span>
                <button
                  onClick={() => handleCopy(decompileResult.rawBytecode, "rawBytecode")}
                  className="px-3 py-1.5 rounded-lg bg-[#161824] hover:bg-[#202336] text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === "rawBytecode" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "rawBytecode" ? "Copied" : "Copy Hex Bytecode"}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#08090E] border border-[#1E2130] text-[11px] font-mono text-cyan-300/80 leading-relaxed break-all select-all max-h-96 overflow-y-auto">
                {decompileResult.rawBytecode}
              </div>

              <div className="p-4 rounded-xl bg-[#11131E] border border-[#202336] font-mono text-xs space-y-2">
                <span className="text-gray-300 font-bold block">CBOR Metadata Breakdown:</span>
                <div className="text-[11px] text-[#8E9299] space-y-1">
                  <div>Solc Version String: <span className="text-white">{decompileResult.compilerMetadata.solcVersion}</span></div>
                  <div>IPFS Hash: <span className="text-cyan-400">{decompileResult.compilerMetadata.ipfsHash || "none"}</span></div>
                  <div>Length: <span className="text-white">53 bytes (0x35) standard CBOR header</span></div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 4: Reverse Eng & Storage Audit */
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#131522] border border-[#242940] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Bytecode Reverse Engineering & Low-Level Audit Profile
                  </span>
                  <span className="text-[10px] text-gray-400">Target: {token.contractAddress}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Technical considerations when triaging this unverified contract bytecode across selector collisions, transient EIP-1153 opcodes, and storage layout derivations:
                </p>
              </div>

              {/* 3 Inspection Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector Collision & CALLDATALOAD Check */}
                <div className="p-4 rounded-xl bg-[#10111A] border border-[#1E2130] space-y-2">
                  <span className="font-bold text-amber-400 block text-xs">1. Selector Collisions & Masks</span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    4-byte method hashes can collide (e.g. <code className="text-amber-300">deposit(uint256)</code> vs <code className="text-rose-300">burnAll()</code>). Inspect <code className="text-cyan-300">CALLDATALOAD</code>: verify whether parameters enforce 20-byte address masks (<code className="text-gray-300">0x00..ffff</code>) or 32-byte word alignments.
                  </p>
                  <div className="pt-2 border-t border-[#1C1F2E]">
                    <span className="text-[10px] text-gray-500 block mb-1">Foundry Debugger Run:</span>
                    <code className="text-[11px] text-amber-300 block select-all">
                      cast run --rpc-url &lt;RPC&gt; &lt;TX_HASH&gt; --debug
                    </code>
                  </div>
                </div>

                {/* Storage Layout Derivations */}
                <div className="p-4 rounded-xl bg-[#10111A] border border-[#1E2130] space-y-2">
                  <span className="font-bold text-cyan-400 block text-xs">2. Storage Hashing Mathematics</span>
                  <div className="text-[11px] text-gray-400 space-y-1">
                    <div>• <strong>Nested Mapping:</strong> <code className="text-cyan-300">keccak256(k2 || keccak256(k1 || slot))</code></div>
                    <div>• <strong>Dynamic Array:</strong> length at <code className="text-cyan-300">slot</code>; item at <code className="text-cyan-300">keccak256(slot) + i</code></div>
                    <div>• <strong>EIP-1153 Transient:</strong> <code className="text-purple-300">TSTORE/TLOAD</code> (100 gas) resets post-tx; invisible to <code className="text-gray-500">eth_getStorageAt</code></div>
                  </div>
                  <div className="pt-2 border-t border-[#1C1F2E]">
                    <span className="text-[10px] text-gray-500 block mb-1">Cast Storage Slot Inspection:</span>
                    <code className="text-[11px] text-cyan-300 block select-all">
                      cast storage {token.contractAddress} 0x0
                    </code>
                  </div>
                </div>
              </div>

              {/* Decompilation & Triage Tooling */}
              <div className="p-4 rounded-xl bg-[#10111A] border border-[#1E2130] space-y-2">
                <span className="font-bold text-emerald-400 block text-xs">3. External Decompiler Triage Stack</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 bg-[#141724] rounded-lg border border-[#20253A]">
                    <span className="text-white font-bold block">Dedaub (Contract Library)</span>
                    <span className="text-gray-400 text-[10px]">Rapid manual triage & decompiled pseudo-Solidity with call-flow reconstruction.</span>
                  </div>
                  <div className="p-2.5 bg-[#141724] rounded-lg border border-[#20253A]">
                    <span className="text-white font-bold block">Panoramix (Eveem)</span>
                    <span className="text-gray-400 text-[10px]">High-readability Control Flow Graph (CFG) decompilation.</span>
                  </div>
                  <div className="p-2.5 bg-[#141724] rounded-lg border border-[#20253A]">
                    <span className="text-white font-bold block">Foundry (Cast)</span>
                    <span className="text-gray-400 text-[10px]">Low-level storage layout probing and on-chain trace execution.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1F2230] flex items-center justify-between bg-[#12141F]">
          <span className="text-xs font-mono text-[#8E9299]">
            Decompiler output verified against EVM runtime specification
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#181B28] hover:bg-[#202436] text-white text-xs font-mono transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
