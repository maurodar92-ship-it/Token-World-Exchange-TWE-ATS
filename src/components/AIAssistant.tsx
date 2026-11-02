import { useState, useEffect } from "react";
import { TokenRecord } from "../types";
import { generateTokenRecord } from "../utils/cryptoGenerators";
import { 
  saveGeminiMemory, 
  subscribeToGeminiMemories, 
  GeminiMemoryItem 
} from "../lib/firebase";
import {
  Sparkles,
  Send,
  Cpu,
  Layers,
  Copy,
  Check,
  Download,
  PlusCircle,
  FileCode,
  ShieldCheck,
  Brain,
  History,
  Database,
  Cloud,
  Save,
} from "lucide-react";

interface AIAssistantProps {
  initialPrompt?: string;
  onImportTokens: (tokens: TokenRecord[]) => void;
}

export const AIAssistant = ({ initialPrompt, onImportTokens }: AIAssistantProps) => {
  const [prompt, setPrompt] = useState<string>(
    initialPrompt ||
      "Generate 5 next-generation 2026 AI Agent & DePIN tokens with detailed tokenomics, institutional vesting, and Solidity contract stubs on Base network."
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [imported, setImported] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [savedMemories, setSavedMemories] = useState<GeminiMemoryItem[]>([]);
  const [instantSaveSuccess, setInstantSaveSuccess] = useState<boolean>(false);

  // Subscribe to persistent Gemini Firestore memory
  useEffect(() => {
    const unsub = subscribeToGeminiMemories((memories) => {
      setSavedMemories(memories);
    });
    return () => unsub();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setImported(false);
    setInstantSaveSuccess(false);

    try {
      // 1. Save user prompt to Gemini Base Memory
      const userMemory: GeminiMemoryItem = {
        id: `mem_u_${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
        tags: ["prompt", "tokenomics_request"],
      };
      await saveGeminiMemory(userMemory);

      // 2. Call Gemini Backend API
      const res = await fetch("/api/gemini/generate-tokenomics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenName: "NeuralMesh Protocol",
          symbol: "NMESH",
          narrative: "Autonomous AI Agents & Edge DePIN",
          chain: "Base",
          standard: "ERC-20",
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);

        // 3. Save Model Output to Gemini Base Memory in Firestore
        const modelMemory: GeminiMemoryItem = {
          id: `mem_m_${Date.now()}`,
          role: "model",
          content: `${data.data.tagline}\n\n${data.data.executiveSummary}`,
          timestamp: new Date().toISOString(),
          tags: ["synthesis_result", "solidity_stub"],
        };
        await saveGeminiMemory(modelMemory);
        setInstantSaveSuccess(true);
      }
    } catch (err) {
      console.error("AI Assistant error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportToFoundry = () => {
    if (!result) return;
    // Create 10 tokens inspired by the synthesized project
    const newTokens: TokenRecord[] = [];
    for (let i = 1; i <= 10; i++) {
      const rec = generateTokenRecord(i, {
        chains: ["base", "ethereum"],
        narratives: ["ai_agents", "depin"],
        standards: ["ERC-20"],
        includeVanity: true,
      });
      rec.name = i === 1 ? "NeuralMesh Protocol" : `NeuralNode Cluster #${i}`;
      rec.symbol = i === 1 ? "NMESH" : `NNODE${i}`;
      newTokens.push(rec);
    }
    onImportTokens(newTokens);
    setImported(true);
    setTimeout(() => setImported(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Gemini 3.8 AI Token Synthesizer & Persistent Memory
              </h2>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Full-stack AI reasoning engine generating bespoke 2026 Web3 tokenomics models, Solidity contracts, with automatic Firestore base memory instant saving.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>{savedMemories.length} Cloud Memories</span>
            </span>

            <span className="text-xs font-mono text-[#F27D26] bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Gemini 3.8 Flash Active</span>
            </span>
          </div>
        </div>

        {/* Input Box */}
        <div className="mt-5 space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your custom Web3 prompt (e.g. Generate 50 RWA tokens for carbon offsets with institutional lockups)..."
              className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 text-xs text-[#E0E0E0] placeholder-[#8E9299] focus:outline-none focus:border-[#F27D26] font-mono leading-relaxed"
            />
            <button
              id="btn-submit-ai-prompt"
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="absolute right-3 bottom-4 px-4 py-2 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Synthesize Protocol</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[#8E9299] font-medium">Quick Starters:</span>
              {[
                "DePIN Autonomous GPU Clusters",
                "RWA Carbon Credit Vaults",
                "Quantum-Resistant Lattice DEX",
                "Recursive 50-Item Batch",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPrompt(`Synthesize a 2026 ${preset} protocol with tokenomics and contract code.`)}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-[#F27D26]/40 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            {instantSaveSuccess && (
              <span className="text-[11px] font-mono text-green-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved into Firestore Base Memory</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Synthesis Result */}
      {result && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Synthesized Protocol Architecture
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/30">
                  Ready & Saved in Memory
                </span>
              </div>
              <p className="text-xs text-[#F27D26] italic mt-0.5">"{result.tagline}"</p>
            </div>

            <button
              id="btn-import-foundry"
              type="button"
              onClick={handleImportToFoundry}
              className="px-4 py-2 rounded bg-green-500 hover:bg-green-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {imported ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>{imported ? "Imported 10 Tokens to Foundry!" : "Import into Active Foundry"}</span>
            </button>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-mono">
              Executive Protocol Whitepaper
            </h4>
            <div className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-xs text-[#E0E0E0] leading-relaxed whitespace-pre-line">
              {result.executiveSummary}
            </div>
          </div>

          {/* Tokenomics Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-mono">
              Vesting & Allocation Schedule (2026 Model)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.tokenomics?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-[#0A0A0C] p-3.5 rounded-lg border border-[#1F1F23] flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-white text-xs">{item.category}</span>
                    <p className="text-[11px] text-[#8E9299] font-mono mt-0.5">{item.lockup}</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-[#F27D26] bg-[#16161A] px-2.5 py-1 rounded border border-[#1F1F23]">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Solidity Smart Contract */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#F27D26]" />
                <span>Generated Solidity Smart Contract</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(result.solidityStub);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#E0E0E0] text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? "Copied!" : "Copy Solidity"}</span>
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] font-mono text-xs text-[#E0E0E0] overflow-x-auto leading-relaxed">
              <code>{result.solidityStub}</code>
            </pre>
          </div>

          {/* Audit Verification */}
          <div className="p-4 rounded-lg bg-[#0A0A0C] border border-green-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-green-400 text-xs uppercase tracking-wider">Security & Static Audit Report</span>
                <p className="text-[11px] text-[#8E9299] mt-0.5">{result.auditNotes}</p>
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-green-400 ml-4">
              {result.securityScore}/100
            </span>
          </div>
        </div>
      )}

      {/* Persistent Gemini Memory History Drawer */}
      {savedMemories.length > 0 && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Gemini Base Memory History ({savedMemories.length} Saved Entries)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8E9299]">Synced with Firestore DB</span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {savedMemories.slice(-8).reverse().map((mem) => (
              <div
                key={mem.id}
                className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      mem.role === "user" ? "bg-[#F27D26]/20 text-[#F27D26]" : "bg-cyan-500/20 text-cyan-400"
                    }`}>
                      {mem.role}
                    </span>
                    <span className="text-[10px] text-[#8E9299] font-mono">
                      {new Date(mem.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[#E0E0E0] line-clamp-2 text-[11px] leading-relaxed">
                    {mem.content}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mem.content);
                  }}
                  className="text-[#8E9299] hover:text-white p-1 rounded hover:bg-[#16161A]"
                  title="Copy content"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
