import { useState } from "react";
import { SCRIPT_TEMPLATES, ScriptDefinition } from "../utils/scriptTemplates";
import {
  Code2,
  Copy,
  Check,
  Download,
  Play,
  Sparkles,
  Zap,
  Terminal,
  Cpu,
  FileCode,
  CheckCircle2,
} from "lucide-react";

export const ScriptHub = () => {
  const [selectedScript, setSelectedScript] = useState<ScriptDefinition>(SCRIPT_TEMPLATES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRunningSim, setIsRunningSim] = useState<boolean>(false);
  const [simOutput, setSimOutput] = useState<string | null>(null);

  // Custom AI Script Generator state
  const [customLanguage, setCustomLanguage] = useState<string>("Python");
  const [customChain, setCustomChain] = useState<string>("EVM / Base");
  const [customCount, setCustomCount] = useState<string>("1,000,000");
  const [customFormat, setCustomFormat] = useState<string>("CSV");
  const [customVanity, setCustomVanity] = useState<boolean>(true);
  const [customNarrative, setCustomNarrative] = useState<string>("AI Agents & DePIN");
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (script: ScriptDefinition) => {
    const blob = new Blob([script.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = script.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const runSimulation = () => {
    setIsRunningSim(true);
    setSimOutput("[*] Initializing memory buffers and worker threads...\n");
    let progress = 0;

    const interval = setInterval(() => {
      progress += 200000;
      if (progress >= 1000000) {
        clearInterval(interval);
        setIsRunningSim(false);
        setSimOutput(
          `[*] Initializing high-throughput ${selectedScript.language.toUpperCase()} workers...\n` +
            `[>] Processed 200,000 / 1,000,000 addresses (20.0%) - ${selectedScript.speedRating}\n` +
            `[>] Processed 400,000 / 1,000,000 addresses (40.0%) - ${selectedScript.speedRating}\n` +
            `[>] Processed 600,000 / 1,000,000 addresses (60.0%) - ${selectedScript.speedRating}\n` +
            `[>] Processed 800,000 / 1,000,000 addresses (80.0%) - ${selectedScript.speedRating}\n` +
            `[>] Processed 1,000,000 / 1,000,000 addresses (100.0%)\n` +
            `[+] SUCCESS: Generated 1,000,000 unique contract IDs & uint256 tokens.\n` +
            `[+] Output written to '${selectedScript.filename.replace(".py", ".csv").replace(".rs", ".csv").replace(".ts", ".csv")}' (Total time: 0.84s)`
        );
      } else {
        setSimOutput((prev) => prev + `[>] Processed ${progress.toLocaleString()} / 1,000,000 records...\n`);
      }
    }, 180);
  };

  const generateCustomAIScript = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/gemini/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: customLanguage,
          targetChain: customChain,
          count: customCount,
          outputFormat: customFormat,
          includeVanity: customVanity,
          narrative: customNarrative,
        }),
      });
      const data = await res.json();
      if (data.success && data.script) {
        const customDef: ScriptDefinition = {
          id: `custom_${Date.now()}`,
          language: customLanguage.toLowerCase(),
          filename: `generated_${customLanguage.toLowerCase()}_script.${customLanguage === "Python" ? "py" : customLanguage === "Rust" ? "rs" : customLanguage === "Go" ? "go" : "ts"}`,
          title: `Custom ${customLanguage} ${customChain} Engine`,
          description: `Custom ${customCount} synthetic dataset script for ${customNarrative}.`,
          chain: customChain,
          speedRating: "Optimized Multi-Threaded",
          code: data.script,
        };
        setSelectedScript(customDef);
      }
    } catch (err) {
      console.error("AI Script generation error:", err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Developer Script Hub (1M+ High Volume)
              </h2>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Production-ready, multi-threaded scripts in Python, Rust, Go, and TypeScript to generate millions of contract addresses and token IDs offline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-green-500 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Multi-Core Parallelized</span>
            </span>
          </div>
        </div>

        {/* Script Selection Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {SCRIPT_TEMPLATES.map((tmpl) => {
            const active = selectedScript.id === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => {
                  setSelectedScript(tmpl);
                  setSimOutput(null);
                }}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  active
                    ? "bg-[#0A0A0C] border-[#F27D26] shadow-md text-white font-medium"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#1E1E24]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase font-mono text-[#F27D26]">
                    {tmpl.language}
                  </span>
                  <span className="text-[10px] text-green-500 font-mono">{tmpl.speedRating}</span>
                </div>
                <p className="font-semibold text-xs text-[#E0E0E0] mt-1 truncate">{tmpl.title}</p>
                <p className="text-[11px] text-[#8E9299] mt-0.5 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Code Viewer & Terminal Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Code Editor */}
        <div className="lg:col-span-2 bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 bg-[#0A0A0C] border-b border-[#1F1F23] flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-[#E0E0E0]">
              <FileCode className="w-4 h-4 text-[#F27D26]" />
              <span className="font-bold text-white">{selectedScript.filename}</span>
              <span className="text-[#8E9299]">({selectedScript.chain})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-run-simulation"
                type="button"
                onClick={runSimulation}
                disabled={isRunningSim}
                className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-black" />
                <span>{isRunningSim ? "Running..." : "Test Run (Simulate)"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(selectedScript.code)}
                className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#E0E0E0] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownload(selectedScript)}
                className="p-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#E0E0E0] transition-all cursor-pointer"
                title="Download Script File"
              >
                <Download className="w-4 h-4 text-[#F27D26]" />
              </button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto bg-[#0A0A0C] flex-1">
            <pre className="font-mono text-xs text-[#E0E0E0] leading-relaxed">
              <code>{selectedScript.code}</code>
            </pre>
          </div>

          {/* Simulated Execution Terminal */}
          {simOutput && (
            <div className="border-t border-[#1F1F23] bg-black p-4 font-mono text-xs text-green-400 animate-fade-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F1F23] text-[11px] text-[#8E9299]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-green-400" />
                  <span>Execution Terminal (Sandbox Simulation)</span>
                </span>
                <span className="text-green-400">Speed: {selectedScript.speedRating}</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{simOutput}</pre>
            </div>
          )}
        </div>

        {/* AI Custom Script Builder Panel */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F27D26]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">AI Custom Script Builder</h3>
            </div>
            <p className="text-xs text-[#8E9299]">
              Prompt Gemini to write a tailored generator script for your exact architecture and blockchain standard.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#E0E0E0] font-semibold block mb-1">Language</label>
                <select
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-2 text-[#E0E0E0] focus:outline-none focus:border-[#F27D26] font-mono"
                >
                  <option value="Python">Python (Multiprocessing)</option>
                  <option value="Rust">Rust (Rayon Parallel)</option>
                  <option value="Go">Go (Goroutines & Channels)</option>
                  <option value="TypeScript">TypeScript (Node.js Streams)</option>
                </select>
              </div>

              <div>
                <label className="text-[#E0E0E0] font-semibold block mb-1">Target Chain</label>
                <select
                  value={customChain}
                  onChange={(e) => setCustomChain(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-2 text-[#E0E0E0] focus:outline-none focus:border-[#F27D26] font-mono"
                >
                  <option value="EVM / Ethereum">EVM (Ethereum, Base, Arbitrum)</option>
                  <option value="Solana Base58">Solana (Base58 Mint Keys)</option>
                  <option value="Bitcoin Runes">Bitcoin Taproot & Runes</option>
                  <option value="Quantum-Hybrid">Quantum-Resistant Falcon-512</option>
                </select>
              </div>

              <div>
                <label className="text-[#E0E0E0] font-semibold block mb-1">Volume Count</label>
                <input
                  type="text"
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-2 text-[#E0E0E0] focus:outline-none focus:border-[#F27D26] font-mono"
                  placeholder="1,000,000"
                />
              </div>

              <div>
                <label className="text-[#E0E0E0] font-semibold block mb-1">2026 Narrative Focus</label>
                <input
                  type="text"
                  value={customNarrative}
                  onChange={(e) => setCustomNarrative(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-2 text-[#E0E0E0] focus:outline-none focus:border-[#F27D26]"
                  placeholder="AI Agents & DePIN Compute"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-[#E0E0E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customVanity}
                    onChange={(e) => setCustomVanity(e.target.checked)}
                    className="rounded border-[#1F1F23] text-[#F27D26] focus:ring-[#F27D26]"
                  />
                  <span>Inject Institutional Vanity Addresses (5%)</span>
                </label>
              </div>
            </div>
          </div>

          <button
            id="btn-generate-ai-script"
            type="button"
            onClick={generateCustomAIScript}
            disabled={isGeneratingAI}
            className="w-full py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingAI ? (
              <>
                <Cpu className="w-4 h-4 animate-spin" />
                <span>Writing {customLanguage} Script...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Synthesize {customLanguage} Script</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
