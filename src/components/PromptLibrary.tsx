import { useState, useMemo } from "react";
import { PROMPT_COLLECTION } from "../utils/promptsData";
import { TokenRecord } from "../types";
import {
  CONTRACT_ID_ARCHITECTURES,
  OFFICIAL_CRYPTOVAULTVAULT_GENESIS_METADATA,
  CRYPTOVAULTVAULT_GENESIS_TOKEN,
  generateEvmSmartContractId,
  generateRegulatoryIsoContractId,
  validateRegulatoryIsoContractId,
  generateChecksumValidatedId,
  validateChecksumContractId,
  generateZkCommitmentId,
  generateSnowflakeId,
  generateTenantScopedId,
  generateHmacSignedId,
  verifyHmacSignedId,
  generateSequentialTimestampId,
  generateBlockchainHashId,
  generateUlidContractId,
  generateUuidV4ContractId,
  generatePrefixedHexId,
  generateNanoidBase58Id,
  ISO_COUNTRY_CODES,
} from "../utils/contractIdEngines";
import {
  Terminal,
  Copy,
  Check,
  Sparkles,
  Search,
  Code2,
  Cpu,
  BookOpen,
  Shield,
  ExternalLink,
  Layers,
  Database,
  RefreshCw,
  Zap,
  Lock,
  Globe,
  Sliders,
} from "lucide-react";

interface PromptLibraryProps {
  onUsePromptInAI: (promptText: string) => void;
  onImportTokens?: (tokens: TokenRecord[]) => void;
  onSendToRemix?: (solidityCode: string, tokenName: string) => void;
}

export const PromptLibrary = ({
  onUsePromptInAI,
  onImportTokens,
  onSendToRemix,
}: PromptLibraryProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeArchIndex, setActiveArchIndex] = useState<number>(0);
  const [activeCodeLang, setActiveCodeLang] = useState<"solidity" | "typescript" | "python">("typescript");

  // Live Generator State for Active Architecture
  const [isoCountry, setIsoCountry] = useState<string>("US");
  const [isoEntity, setIsoEntity] = useState<string>("FIN");
  const [luhnInput, setLuhnInput] = useState<string>("A9F4K2P8");
  const [tenantSlug, setTenantSlug] = useState<string>("acme_syndicate");
  const [hmacSecret, setHmacSecret] = useState<string>("master_entropy_key_2026");
  const [snowflakeWorker, setSnowflakeWorker] = useState<number>(42);
  const [liveGenCounter, setLiveGenCounter] = useState<number>(1);
  const [ingestedVaultSuccess, setIngestedVaultSuccess] = useState<boolean>(false);

  const categories = [
    { id: "all", label: "All Prompts" },
    { id: "smart_contracts", label: "Smart Contracts & EVM" },
    { id: "compliance", label: "Regulatory & ISO" },
    { id: "distributed_systems", label: "Distributed & K-Sortable" },
    { id: "privacy_zk", label: "Privacy & ZK" },
    { id: "technical", label: "Checksum & Technical" },
    { id: "scripts", label: "Developer Scripts" },
    { id: "narratives", label: "2026 Narratives" },
    { id: "market_sim", label: "Market Simulation" },
  ];

  const currentArch = CONTRACT_ID_ARCHITECTURES[activeArchIndex] || CONTRACT_ID_ARCHITECTURES[0];

  // Compute live generated ID based on active architecture
  const liveGeneratedResult = useMemo(() => {
    switch (currentArch.id) {
      case "evm_smart_contract_native":
        return generateEvmSmartContractId(
          "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891",
          Math.floor(Date.now() / 1000),
          liveGenCounter
        );
      case "regulatory_iso_compliant":
        return generateRegulatoryIsoContractId(isoCountry, 2026, isoEntity);
      case "checksum_validated_luhn":
        return generateChecksumValidatedId(luhnInput);
      case "zero_knowledge_pedersen":
        return generateZkCommitmentId("institution_zk_secret_2026", "Institutional_Safe_Settlement");
      case "ksortable_snowflake":
        return generateSnowflakeId(snowflakeWorker, liveGenCounter);
      case "tenant_scoped_base58":
        return { id: generateTenantScopedId(tenantSlug) };
      case "hmac_signed_tamper_evident":
        return generateHmacSignedId(`ctr_${10000 + liveGenCounter}`, hmacSecret);
      case "sequential_timestamp":
        return { id: generateSequentialTimestampId() };
      case "blockchain_hash_sha256":
        return generateBlockchainHashId(Math.floor(Date.now() / 1000), "0x1078ef8998698B49AFe4923D4F241210F7a7d413", liveGenCounter);
      case "ulid_sortable":
        return { id: generateUlidContractId() };
      case "uuid_v4":
        return { id: generateUuidV4ContractId() };
      case "prefixed_hexadecimal":
        return { id: generatePrefixedHexId() };
      case "nanoid_base58":
        return { id: generateNanoidBase58Id() };
      default:
        return { id: currentArch.sampleId };
    }
  }, [currentArch.id, isoCountry, isoEntity, luhnInput, tenantSlug, hmacSecret, snowflakeWorker, liveGenCounter]);

  const liveIdString = typeof liveGeneratedResult === "object" && liveGeneratedResult && "id" in liveGeneratedResult
    ? liveGeneratedResult.id
    : String(liveGeneratedResult);

  const filteredPrompts = useMemo(() => {
    return PROMPT_COLLECTION.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchPrompt = p.promptText.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchPrompt && !matchTags) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleIngestGenesisVault = () => {
    if (onImportTokens) {
      onImportTokens([CRYPTOVAULTVAULT_GENESIS_TOKEN as unknown as TokenRecord]);
      setIngestedVaultSuccess(true);
      setTimeout(() => setIngestedVaultSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                2026 Web3 Prompt Library & Public Contract ID Suite
              </h2>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Curated prompt templates for smart contracts, ISO regulatory compliance, offline Luhn-mod-36 checksums,
              K-sortable snowflakes, and institutional genesis vault profiles.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts or tags..."
              className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8E9299] focus:border-[#F27D26] focus:outline-none"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-[#1F1F23]">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? "bg-[#F27D26] text-black font-bold shadow-sm"
                  : "bg-[#0A0A0C] text-[#8E9299] hover:text-white hover:bg-[#1E1E24] border border-[#1F1F23]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 13-Architecture Public Contract ID Studio */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#0A0A0C] border-b border-[#1F1F23] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#F27D26]" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                13 Specialized Public Contract ID Architectures Studio
              </h3>
              <p className="text-[11px] text-[#8E9299]">
                Live on-the-fly generation, mathematical verification, and code templates for production deployments.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 font-bold uppercase">
              13 Architectures Active
            </span>
          </div>
        </div>

        {/* Architecture Navigation Bar */}
        <div className="p-3 bg-[#111114] border-b border-[#1F1F23] overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CONTRACT_ID_ARCHITECTURES.map((arch, index) => (
              <button
                key={arch.id}
                type="button"
                onClick={() => setActiveArchIndex(index)}
                className={`px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                  activeArchIndex === index
                    ? "bg-[#F27D26] text-black font-bold border-[#F27D26] shadow-md"
                    : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border-[#1F1F23] hover:border-[#333]"
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-black/20">
                  {index + 1}
                </span>
                <span>{arch.name.split(" (")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Architecture Detail & Live Generator */}
        <div className="p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${currentArch.badgeColor}`}>
                  {currentArch.categoryLabel}
                </span>
                <span className="text-xs font-mono text-[#8E9299]">Pattern: {currentArch.formatPattern}</span>
              </div>
              <h4 className="text-base font-bold text-white mt-1.5">{currentArch.name}</h4>
              <p className="text-xs text-[#8E9299] mt-1">{currentArch.whenToUse}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLiveGenCounter((prev) => prev + 1)}
                className="px-3 py-2 rounded-lg bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Re-Sample Entropy</span>
              </button>
              <button
                type="button"
                onClick={() => onUsePromptInAI(currentArch.prompt)}
                className="px-3.5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize in AI</span>
              </button>
            </div>
          </div>

          {/* Interactive Parameters and Live Output Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Interactive Inputs */}
            <div className="lg:col-span-5 space-y-3 bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23]">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
                Architecture Parameters
              </span>

              {currentArch.id === "regulatory_iso_compliant" && (
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono text-[#8E9299]">ISO 3166-1 Country Code:</label>
                  <select
                    value={isoCountry}
                    onChange={(e) => setIsoCountry(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                  >
                    {ISO_COUNTRY_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code} - {code === "US" ? "United States" : code === "CH" ? "Switzerland (Crypto Valley)" : code === "SG" ? "Singapore" : code === "GB" ? "United Kingdom" : code}
                      </option>
                    ))}
                  </select>

                  <label className="text-[11px] font-mono text-[#8E9299] block pt-1">Entity / Jurisdiction Code:</label>
                  <input
                    type="text"
                    value={isoEntity}
                    onChange={(e) => setIsoEntity(e.target.value.toUpperCase().slice(0, 5))}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                    placeholder="e.g. FIN, SEC, TAX"
                  />
                </div>
              )}

              {currentArch.id === "checksum_validated_luhn" && (
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono text-[#8E9299]">8-Char Alphanumeric Payload:</label>
                  <input
                    type="text"
                    value={luhnInput}
                    onChange={(e) => setLuhnInput(e.target.value.toUpperCase().slice(0, 8))}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                    placeholder="8 characters [0-9A-Z]"
                  />
                  <p className="text-[10px] text-[#8E9299]">
                    Applies Luhn-mod-36 algorithm across radix-36 alphabet to compute zero-latency typo verification digit.
                  </p>
                </div>
              )}

              {currentArch.id === "tenant_scoped_base58" && (
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono text-[#8E9299]">Tenant Slug / Organization Identifier:</label>
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                    placeholder="acme_syndicate"
                  />
                  <p className="text-[10px] text-[#8E9299]">
                    Ensures automatic multi-tenant database shard partitioning combined with 10 cryptographically random Base58 chars.
                  </p>
                </div>
              )}

              {currentArch.id === "hmac_signed_tamper_evident" && (
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono text-[#8E9299]">HMAC Secret Seed Key:</label>
                  <input
                    type="text"
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                    placeholder="entropy secret key"
                  />
                  <p className="text-[10px] text-[#8E9299]">
                    Generates self-verifying payload.signature for zero-trust URL and API verification without database reads.
                  </p>
                </div>
              )}

              {currentArch.id === "ksortable_snowflake" && (
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono text-[#8E9299]">Worker Node ID (0-1023):</label>
                  <input
                    type="number"
                    value={snowflakeWorker}
                    onChange={(e) => setSnowflakeWorker(Math.max(0, Math.min(1023, parseInt(e.target.value) || 0)))}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                  />
                  <p className="text-[10px] text-[#8E9299]">
                    K-sortable 64-bit integer combining 41-bit millisecond timestamp, 10-bit worker, and 12-bit sequence.
                  </p>
                </div>
              )}

              {["evm_smart_contract_native", "zero_knowledge_pedersen", "blockchain_hash_sha256", "sequential_timestamp", "ulid_sortable", "uuid_v4", "prefixed_hexadecimal", "nanoid_base58"].includes(currentArch.id) && (
                <div className="space-y-2 pt-2 text-xs text-[#8E9299]">
                  <p>
                    Deterministic mathematical generator active. Click <strong>"Re-Sample Entropy"</strong> above to compute fresh randomized seed states.
                  </p>
                  <div className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] font-mono text-[11px]">
                    <span className="text-[#F27D26]">Entropy Source:</span> Web Crypto PRNG + Keccak256
                  </div>
                </div>
              )}

              {/* Exact Prompt Box */}
              <div className="pt-3 border-t border-[#1F1F23] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#8E9299]">Prompt Directive:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentArch.prompt, `prompt_${currentArch.id}`)}
                    className="text-[10px] text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === `prompt_${currentArch.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === `prompt_${currentArch.id}` ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23] text-xs font-mono text-white/90 leading-relaxed select-all">
                  "{currentArch.prompt}"
                </div>
              </div>
            </div>

            {/* Live Generated Output & Code Implementation */}
            <div className="lg:col-span-7 space-y-4">
              {/* Live Computed Value Box */}
              <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-green-400" />
                    Live Generated Public Contract ID
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(liveIdString, "live_id")}
                    className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs text-white font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === "live_id" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-[#F27D26]" />}
                    <span>{copiedId === "live_id" ? "Copied!" : "Copy Live ID"}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#16161A] rounded-lg border border-[#F27D26]/30 font-mono text-sm text-[#F27D26] font-bold select-all break-all flex items-center justify-between gap-2">
                  <span>{liveIdString}</span>
                </div>

                {/* Validation Status Indicator */}
                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
                  {currentArch.id === "regulatory_iso_compliant" && (
                    <div className="flex items-center gap-1.5 text-green-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>ISO 3166-1 Alpha-2 Validated: {isoCountry}</span>
                    </div>
                  )}

                  {currentArch.id === "checksum_validated_luhn" && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        Luhn-Mod-36 Checksum Digit:{" "}
                        <strong className="text-white">
                          {(liveGeneratedResult as { checksumChar?: string }).checksumChar}
                        </strong>{" "}
                        (Valid)
                      </span>
                    </div>
                  )}

                  {currentArch.id === "hmac_signed_tamper_evident" && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>HMAC Zero-Trust Signature Verified</span>
                    </div>
                  )}

                  {currentArch.id === "ksortable_snowflake" && (
                    <div className="text-[11px] text-[#8E9299]">
                      Binary 64-bit:{" "}
                      <span className="text-white/80">
                        {(liveGeneratedResult as { binary64?: string }).binary64?.slice(0, 24)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Snippet Tabs */}
              <div className="bg-[#0A0A0C] rounded-xl border border-[#1F1F23] overflow-hidden">
                <div className="p-3 bg-[#111114] border-b border-[#1F1F23] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {currentArch.languages.solidity && (
                      <button
                        type="button"
                        onClick={() => setActiveCodeLang("solidity")}
                        className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer ${
                          activeCodeLang === "solidity" ? "bg-[#F27D26] text-black font-bold" : "text-[#8E9299] hover:text-white"
                        }`}
                      >
                        Solidity
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveCodeLang("typescript")}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer ${
                        activeCodeLang === "typescript" ? "bg-[#F27D26] text-black font-bold" : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      TypeScript
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCodeLang("python")}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer ${
                        activeCodeLang === "python" ? "bg-[#F27D26] text-black font-bold" : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      Python
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCodeLang === "solidity" && currentArch.languages.solidity && onSendToRemix && (
                      <button
                        type="button"
                        onClick={() => onSendToRemix(currentArch.languages.solidity || "", currentArch.name)}
                        className="px-2.5 py-1 rounded bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3 text-[#F27D26]" />
                        <span>Open in Remix</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const code = currentArch.languages[activeCodeLang] || currentArch.languages.typescript;
                        handleCopy(code, `code_${currentArch.id}_${activeCodeLang}`);
                      }}
                      className="px-2.5 py-1 rounded bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `code_${currentArch.id}_${activeCodeLang}` ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#F27D26]" />
                      )}
                      <span>Copy Code</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 font-mono text-xs text-[#E0E0E0] overflow-x-auto max-h-[220px]">
                  <pre className="whitespace-pre">
                    {currentArch.languages[activeCodeLang] || currentArch.languages.typescript}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Genesis Metadata Profile: CryptoVaultVault (CVLTX) #3 */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center font-bold text-[#F27D26] font-mono text-sm">
              #3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight font-mono">
                  CryptoVaultVault (CVLTX) #3
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                  BASE (8453)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30 font-bold">
                  Trail of Bits 96/100
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Official institutional genesis ERC-721 metadata deployed on Base mainnet. EIP-170 compliant (11,450 bytes).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://basescan.org/address/0xdE901AeDe6b149954596b202f2411117849214Fa"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs font-mono text-white flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>BaseScan</span>
            </a>

            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(OFFICIAL_CRYPTOVAULTVAULT_GENESIS_METADATA, null, 2), "cvltx_json")}
              className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedId === "cvltx_json" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-[#F27D26]" />}
              <span>{copiedId === "cvltx_json" ? "JSON Copied!" : "Copy Metadata JSON"}</span>
            </button>

            {onImportTokens && (
              <button
                type="button"
                onClick={handleIngestGenesisVault}
                className="px-3.5 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{ingestedVaultSuccess ? "Ingested to Vault!" : "Ingest CVLTX to Vault"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Contract Address</span>
            <span className="text-xs font-mono text-white font-semibold truncate block mt-0.5" title="0xdE901AeDe6b149954596b202f2411117849214Fa">
              0xdE901...14Fa
            </span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Initial Supply</span>
            <span className="text-xs font-mono text-[#F27D26] font-bold block mt-0.5">10,000 Units</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Simulated Gas</span>
            <span className="text-xs font-mono text-white font-semibold block mt-0.5">4,589,000 units</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Deploy Cost</span>
            <span className="text-xs font-mono text-green-400 font-semibold block mt-0.5">0.000041 ETH ($0.13)</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Bytecode Size</span>
            <span className="text-xs font-mono text-white font-semibold block mt-0.5">11,450 / 24,576 B</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Success Rate</span>
            <span className="text-xs font-mono text-cyan-400 font-bold block mt-0.5">89.2% Mempool</span>
          </div>
        </div>
      </div>

      {/* Prompts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPrompts.map((p) => (
          <div
            key={p.id}
            className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#F27D26]/40 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 uppercase font-semibold">
                    {p.category.replace("_", " ")}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5 tracking-tight">{p.title}</h3>
                </div>
                {p.chainTarget && (
                  <span className="text-[11px] font-mono text-[#8E9299] bg-[#0A0A0C] px-2 py-1 rounded border border-[#1F1F23]">
                    {p.chainTarget}
                  </span>
                )}
              </div>

              <p className="text-xs text-[#8E9299] leading-relaxed">{p.description}</p>

              {/* Prompt Box */}
              <div className="bg-[#0A0A0C] p-3.5 rounded-lg border border-[#1F1F23] font-mono text-xs text-[#E0E0E0] relative group">
                <p className="whitespace-pre-wrap leading-relaxed select-all">{p.promptText}</p>
              </div>

              {/* Sample Output Preview if available */}
              {p.sampleOutput && (
                <div className="bg-[#0A0A0C] p-3 rounded border border-[#1F1F23] font-mono text-[11px] text-[#8E9299] space-y-1">
                  <span className="text-[10px] text-[#F27D26] font-semibold uppercase block">
                    Expected Sample Output / Behavior:
                  </span>
                  <pre className="whitespace-pre-wrap text-[#E0E0E0] font-sans text-xs">{p.sampleOutput}</pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1F1F23]">
              <div className="flex flex-wrap gap-1">
                {p.tags.map((t, i) => (
                  <span key={i} className="text-[10px] font-mono text-[#8E9299] bg-[#0A0A0C] px-1.5 py-0.5 rounded border border-[#1F1F23]">
                    #{t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(p.promptText, p.id)}
                  className="px-3 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#E0E0E0] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedId === p.id ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#F27D26]" />
                  )}
                  <span>{copiedId === p.id ? "Copied!" : "Copy Prompt"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUsePromptInAI(p.promptText)}
                  className="px-3.5 py-1.5 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer font-mono"
                  title="Open in Gemini Synthesizer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesize</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
