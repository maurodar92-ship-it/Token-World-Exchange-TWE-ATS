import { TokenRecord, NarrativeCategory, Web3Genre, TokenStandard, ChainType } from "../types";

export type CategoricalTagId =
  | "high-yield"
  | "experimental"
  | "governance"
  | "institutional"
  | "ai-agent"
  | "depin"
  | "gaming"
  | "privacy-zk"
  | "rwa-backed"
  | "restaking"
  | "meme-viral"
  | "layer2"
  | "sovereign-reserve"
  | "vanity-id";

export interface CategoricalTagDef {
  id: CategoricalTagId;
  label: string;
  description: string;
  category: "finance" | "governance" | "innovation" | "infrastructure" | "culture" | "metaverse";
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  hoverBorder: string;
  keywords: string[];
  narratives?: string[];
  chains?: ChainType[];
  standards?: TokenStandard[];
}

export const CATEGORICAL_TAG_DEFINITIONS: Record<CategoricalTagId, CategoricalTagDef> = {
  "high-yield": {
    id: "high-yield",
    label: "High-Yield",
    description: "High-yield staking, liquidity vault, APY harvesting, and DeFi compounding mechanisms",
    category: "finance",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-400",
    dotColor: "bg-emerald-400",
    hoverBorder: "hover:border-emerald-400/60",
    keywords: [
      "yield", "vault", "stake", "staking", "apy", "earn", "harvest", "liquidity",
      "farm", "farming", "compound", "dividend", "cashflow", "reward", "pool",
      "interest", "staker", "alpha", "lending", "borrow", "debt", "margin", "restake",
      "lp", "amm", "dex", "swap", "reserve", "liquiditypair"
    ],
    narratives: ["defi", "quantum_defi", "liquid_restaking"],
  },
  "experimental": {
    id: "experimental",
    label: "Experimental",
    description: "Cutting-edge cryptographic protocols, quantum lattice algorithms, and uncapped continuous architectures",
    category: "innovation",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-400",
    dotColor: "bg-purple-400",
    hoverBorder: "hover:border-purple-400/60",
    keywords: [
      "experimental", "quantum", "recursive", "synthetic", "neural", "zk", "zero-knowledge",
      "sandbox", "lab", "test", "unhinged", "chaos", "frontier", "speculative", "mutant",
      "warp", "infinite", "uncapped", "hyper", "entropy", "lattice", "snark", "stark",
      "fhe", "homomorphic", "novel", "prototype", "genesis", "continuous", "falcon", "dilithium"
    ],
    narratives: ["quantum_defi", "desci_biotech", "autonomous_worlds"],
  },
  "governance": {
    id: "governance",
    label: "Governance",
    description: "Decentralized autonomous governance, multisig quorum voting, timelocks, and sovereign protocol controls",
    category: "governance",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-400",
    dotColor: "bg-amber-400",
    hoverBorder: "hover:border-amber-400/60",
    keywords: [
      "governance", "dao", "vote", "voting", "ballot", "council", "senate", "quorum",
      "proposal", "sovereign", "constitution", "parliament", "delegate", "timelock",
      "veto", "chamber", "civic", "federation", "multisig", "owner", "ownable", "2step",
      "curator", "bureau", "polity", "tally", "democracy", "citizen", "consensus"
    ],
    narratives: ["onchain_identity"],
  },
  "institutional": {
    id: "institutional",
    label: "Institutional",
    description: "Enterprise-grade smart contracts, treasury reserves, multi-sig vaults, and institutional compliance standards",
    category: "finance",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-400",
    dotColor: "bg-sky-400",
    hoverBorder: "hover:border-sky-400/60",
    keywords: [
      "institutional", "reserve", "treasury", "enterprise", "safe", "custody", "sovereign",
      "tier-1", "corporate", "clearing", "settlement", "compliance", "etf", "accredited",
      "audit", "seaport", "iso", "fiduciary", "peg", "bank", "capital", "fund"
    ],
    narratives: ["rwa", "rwa_tokenization"],
  },
  "ai-agent": {
    id: "ai-agent",
    label: "AI Agent",
    description: "Autonomous AI agents, decentralized inference, on-chain cognitive swarms, and synthetic neural protocols",
    category: "innovation",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-400",
    dotColor: "bg-cyan-400",
    hoverBorder: "hover:border-cyan-400/60",
    keywords: [
      "ai", "agent", "autonomous", "neural", "cortex", "intelligence", "model", "cognitive",
      "prompt", "swarm", "sentient", "cyber", "matrix", "mind", "deep", "inference",
      "brain", "bot", "algorithm", "llm", "vision", "synapse", "intellect", "vector"
    ],
    narratives: ["ai_agents", "ai_agent"],
  },
  "depin": {
    id: "depin",
    label: "DePIN",
    description: "Decentralized Physical Infrastructure Networks, wireless mesh, GPU clusters, and machine telemetry settlement",
    category: "infrastructure",
    badgeBg: "bg-teal-500/10",
    badgeBorder: "border-teal-500/30",
    badgeText: "text-teal-400",
    dotColor: "bg-teal-400",
    hoverBorder: "hover:border-teal-400/60",
    keywords: [
      "depin", "sensor", "hardware", "telemetry", "mesh", "bandwidth", "compute", "wireless",
      "iot", "node", "network", "relay", "satellite", "radio", "edge", "gpu", "cellular",
      "lorawan", "physical", "ping", "signal", "tower", "coverage", "grid", "power"
    ],
    narratives: ["depin", "depin_infra"],
  },
  "gaming": {
    id: "gaming",
    label: "Gaming & Worlds",
    description: "Autonomous gaming economies, multiverse craftables, on-chain loot systems, and interactive NFT artifacts",
    category: "metaverse",
    badgeBg: "bg-pink-500/10",
    badgeBorder: "border-pink-500/30",
    badgeText: "text-pink-400",
    dotColor: "bg-pink-400",
    hoverBorder: "hover:border-pink-400/60",
    keywords: [
      "game", "gaming", "loot", "quest", "craft", "avatar", "virtual", "world", "arena",
      "play", "rpg", "pixel", "skin", "item", "guild", "multiverse", "dungeon", "hero",
      "sword", "relic", "battle", "arcade", "metaverse", "realm", "fantasy"
    ],
    narratives: ["gaming_media", "autonomous_worlds"],
    standards: ["ERC-721", "ERC-1155"],
  },
  "privacy-zk": {
    id: "privacy-zk",
    label: "Privacy & ZK",
    description: "Zero-knowledge cryptography, private shielded transfers, stealth addresses, and confidential computation",
    category: "innovation",
    badgeBg: "bg-indigo-500/10",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-400",
    dotColor: "bg-indigo-400",
    hoverBorder: "hover:border-indigo-400/60",
    keywords: [
      "privacy", "private", "shield", "stealth", "zk", "snark", "stark", "anonymous",
      "secret", "dark", "hidden", "shadow", "cipher", "mixer", "ring", "obfuscated",
      "blind", "pedersen", "commitment", "shielded", "confidential"
    ],
    narratives: ["quantum_defi", "zk_privacy"],
  },
  "rwa-backed": {
    id: "rwa-backed",
    label: "RWA Backed",
    description: "Real-world asset tokenization, commodity oracles, physical property backing, and sovereign debt instruments",
    category: "finance",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
    badgeText: "text-rose-400",
    dotColor: "bg-rose-400",
    hoverBorder: "hover:border-rose-400/60",
    keywords: [
      "rwa", "real estate", "property", "carbon", "credit", "treasury", "bond", "gold",
      "commodity", "physical", "asset", "mineral", "equity", "land", "t-bill", "invoice",
      "synthetic", "housing", "silver", "oil", "timber", "yield-backed"
    ],
    narratives: ["rwa", "rwa_tokenization"],
  },
  "restaking": {
    id: "restaking",
    label: "Restaking",
    description: "Pooled Actively Validated Services (AVS), restaked collateral derivatives, and shared validator security",
    category: "infrastructure",
    badgeBg: "bg-yellow-500/10",
    badgeBorder: "border-yellow-500/30",
    badgeText: "text-yellow-400",
    dotColor: "bg-yellow-400",
    hoverBorder: "hover:border-yellow-400/60",
    keywords: [
      "restaking", "eigen", "avs", "slashing", "derivative", "lst", "lrt", "staked",
      "pooled", "symbiotic", "beacon", "validator", "re-stake", "liquid-restake"
    ],
    narratives: ["liquid_restaking"],
  },
  "meme-viral": {
    id: "meme-viral",
    label: "Meme & Viral",
    description: "Viral community culture, internet lore memes, high-velocity social momentum, and decentralized banter",
    category: "culture",
    badgeBg: "bg-lime-500/10",
    badgeBorder: "border-lime-500/30",
    badgeText: "text-lime-400",
    dotColor: "bg-lime-400",
    hoverBorder: "hover:border-lime-400/60",
    keywords: [
      "meme", "doge", "pepe", "shib", "moon", "rocket", "based", "chad", "wojak",
      "cat", "woof", "hype", "fren", "degen", "inu", "frog", "ape", "bonk", "pump"
    ],
    narratives: ["meme_speculative", "meme"],
  },
  "layer2": {
    id: "layer2",
    label: "Layer-2 Rollup",
    description: "High-throughput Layer-2 rollups, sub-cent transaction execution, and state compression sequencers",
    category: "infrastructure",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-400",
    dotColor: "bg-blue-400",
    hoverBorder: "hover:border-blue-400/60",
    keywords: [
      "rollup", "sequencer", "optimism", "arbitrum", "base", "polygon", "l2", "layer2",
      "validium", "batch", "compression", "scaling", "zkrollup", "op-stack", "arbitrum-orbit"
    ],
    narratives: ["layer2_rollup"],
    chains: ["arbitrum", "base", "polygon"],
  },
  "sovereign-reserve": {
    id: "sovereign-reserve",
    label: "Sovereign Reserve",
    description: "Sovereign 2^8 tokenomics with uint256 mathematical boundaries and >= $3 Trillion market valuation floor",
    category: "finance",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
    badgeText: "text-orange-400",
    dotColor: "bg-orange-400",
    hoverBorder: "hover:border-orange-400/60",
    keywords: [
      "sovereign", "reserve", "power-of-two", "cmc-floor", "coinmarketcap",
      "trillion", "mcap", "treasury", "dar", "2^8", "dar-sovereign", "enterprise-safe"
    ],
  },
  "vanity-id": {
    id: "vanity-id",
    label: "Vanity ID",
    description: "Cryptographically mined vanity contract addresses with deterministic hex character prefixes",
    category: "infrastructure",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-300",
    dotColor: "bg-cyan-300",
    hoverBorder: "hover:border-cyan-300/60",
    keywords: [
      "vanity", "0x000", "0xace", "0xdefi", "custom-prefix", "eip-55", "vanity-hash"
    ],
  },
};

export const ALL_CATEGORICAL_TAG_IDS = Object.keys(
  CATEGORICAL_TAG_DEFINITIONS
) as CategoricalTagId[];

export interface TaggingOptions {
  preserveExisting?: boolean; // When true, keeps existing tags and appends new matching categorical tags
  maxTagsPerToken?: number; // Maximum tags per token (default: 3, range: 1-5)
  minScoreThreshold?: number; // Minimum relevance score to assign tag (default: 2.0)
}

export interface TagScanReport {
  token: TokenRecord;
  appliedTags: CategoricalTagId[];
  scores: Record<CategoricalTagId, number>;
}

export interface BatchTaggingResult {
  updatedTokens: TokenRecord[];
  totalScanned: number;
  totalTagsApplied: number;
  newlyTaggedTokensCount: number;
  tagFrequency: Record<CategoricalTagId, number>;
}

/**
 * Normalizes text for keyword matching: removes non-alphanumeric punctuation and splits into tokens.
 */
function normalizeTokens(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

/**
 * Evaluates relevance scores for a single token against all categorical tags.
 */
export function evaluateTokenTagScores(token: TokenRecord): Record<CategoricalTagId, number> {
  const scores: Record<CategoricalTagId, number> = {} as Record<CategoricalTagId, number>;
  ALL_CATEGORICAL_TAG_IDS.forEach((id) => {
    scores[id] = 0;
  });

  const nameWords = normalizeTokens(token.name);
  const symbolWords = normalizeTokens(token.symbol);
  const narrativeStr = (token.narrative || "").toLowerCase();
  const genreStr = (token.genre || "").toLowerCase();
  const archetypeStr = (token.contractArchetype || "").toLowerCase();
  const evolutionNote = (token.marketEvolutionNote || "").toLowerCase();
  const pairStr = (token.liquidityPair || "").toLowerCase();

  // Explicit feature checks
  if (token.isVanity) {
    scores["vanity-id"] += 6.0;
  }
  if (token.marketCap >= 3_000_000_000_000 || token.targetOwner?.includes("Dar")) {
    scores["sovereign-reserve"] += 5.0;
  }
  if (token.isEnterprise || token.enterpriseTier) {
    scores["institutional"] += 3.0;
  }

  // Chain-specific boosts
  if (["base", "arbitrum", "polygon", "optimism"].includes(token.chain)) {
    scores["layer2"] += 2.0;
  }

  // Token standard boosts
  if (token.tokenStandard === "ERC-721" || token.tokenStandard === "ERC-1155") {
    scores["gaming"] += 2.5;
  }

  ALL_CATEGORICAL_TAG_IDS.forEach((tagId) => {
    const def = CATEGORICAL_TAG_DEFINITIONS[tagId];

    // 1. Narrative Category matching (High weight: +4.0)
    if (def.narratives) {
      const narrativeMatch = def.narratives.some(
        (n) => narrativeStr.includes(n) || n.includes(narrativeStr)
      );
      if (narrativeMatch) {
        scores[tagId] += 4.0;
      }
    }

    // 2. Keyword matching in Token Name (Weight: +3.0 per matching keyword)
    def.keywords.forEach((kw) => {
      const lowerKw = kw.toLowerCase();
      // Exact word match in name
      if (nameWords.includes(lowerKw)) {
        scores[tagId] += 3.5;
      } else if (token.name.toLowerCase().includes(lowerKw)) {
        scores[tagId] += 2.0;
      }

      // Symbol match
      if (symbolWords.includes(lowerKw) || token.symbol.toLowerCase() === lowerKw) {
        scores[tagId] += 3.0;
      }

      // Genre match
      if (genreStr.includes(lowerKw)) {
        scores[tagId] += 2.0;
      }

      // Archetype match
      if (archetypeStr.includes(lowerKw)) {
        scores[tagId] += 1.5;
      }

      // Liquidity pair & note match
      if (pairStr.includes(lowerKw)) {
        scores[tagId] += 1.0;
      }
      if (evolutionNote.includes(lowerKw)) {
        scores[tagId] += 1.0;
      }
    });
  });

  return scores;
}

/**
 * Scans a single token and selects the top matching categorical tags.
 */
export function scanTokenForCategoricalTags(
  token: TokenRecord,
  options: TaggingOptions = {}
): CategoricalTagId[] {
  const maxTags = Math.min(Math.max(options.maxTagsPerToken ?? 3, 1), 5);
  const minScore = options.minScoreThreshold ?? 2.0;
  const scores = evaluateTokenTagScores(token);

  // Sort candidate tags by score descending
  const candidates = ALL_CATEGORICAL_TAG_IDS.map((id) => ({
    id,
    score: scores[id],
  }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const selectedTags: CategoricalTagId[] = candidates
    .slice(0, maxTags)
    .map((c) => c.id);

  // Guarantee at least one intelligent default tag if none met the threshold
  if (selectedTags.length === 0) {
    if (token.narrative === "ai_agents") {
      selectedTags.push("ai-agent");
    } else if (token.narrative === "depin") {
      selectedTags.push("depin");
    } else if (token.narrative === "rwa") {
      selectedTags.push("rwa-backed");
    } else if (token.narrative === "quantum_defi") {
      selectedTags.push("experimental");
    } else if (token.narrative === "liquid_restaking") {
      selectedTags.push("restaking");
    } else if (token.narrative === "autonomous_worlds") {
      selectedTags.push("gaming");
    } else if (token.chain === "base" || token.chain === "arbitrum") {
      selectedTags.push("layer2");
    } else {
      selectedTags.push("high-yield");
    }
  }

  return selectedTags;
}

/**
 * Scans and applies categorical tags to a single token record, returning a new updated TokenRecord.
 */
export function scanAndApplyCategoricalTags(
  token: TokenRecord,
  options: TaggingOptions = {}
): TokenRecord {
  const scannedTags = scanTokenForCategoricalTags(token, options);

  let finalTags: string[];
  if (options.preserveExisting && token.tags && token.tags.length > 0) {
    // Merge existing with newly scanned, preserving distinct tag strings
    const set = new Set([...token.tags, ...scannedTags]);
    finalTags = Array.from(set);
  } else {
    finalTags = scannedTags;
  }

  return {
    ...token,
    tags: finalTags,
  };
}

/**
 * Batch scans and applies categorical tags across an entire token collection.
 */
export function batchScanAndApplyTags(
  tokens: TokenRecord[],
  options: TaggingOptions = {}
): BatchTaggingResult {
  const tagFrequency: Record<CategoricalTagId, number> = {} as Record<CategoricalTagId, number>;
  ALL_CATEGORICAL_TAG_IDS.forEach((id) => {
    tagFrequency[id] = 0;
  });

  let totalTagsApplied = 0;
  let newlyTaggedTokensCount = 0;

  const updatedTokens = tokens.map((token) => {
    const prevTagsCount = token.tags?.length || 0;
    const updated = scanAndApplyCategoricalTags(token, options);
    const newTags = updated.tags || [];

    if (newTags.length > prevTagsCount || prevTagsCount === 0) {
      newlyTaggedTokensCount++;
    }

    newTags.forEach((tag) => {
      totalTagsApplied++;
      const tagKey = tag.toLowerCase() as CategoricalTagId;
      if (tagFrequency[tagKey] !== undefined) {
        tagFrequency[tagKey] = (tagFrequency[tagKey] || 0) + 1;
      }
    });

    return updated;
  });

  return {
    updatedTokens,
    totalScanned: tokens.length,
    totalTagsApplied,
    newlyTaggedTokensCount,
    tagFrequency,
  };
}

/**
 * Returns helper metadata for a tag, matching both formatted IDs and friendly names.
 */
export function getCategoricalTagMeta(tagStr: string): CategoricalTagDef | undefined {
  if (!tagStr) return undefined;
  const normalized = tagStr.toLowerCase().trim() as CategoricalTagId;

  if (CATEGORICAL_TAG_DEFINITIONS[normalized]) {
    return CATEGORICAL_TAG_DEFINITIONS[normalized];
  }

  // Fallback fuzzy search for tags like 'High-Yield' -> 'high-yield'
  const found = Object.values(CATEGORICAL_TAG_DEFINITIONS).find(
    (def) =>
      def.id.toLowerCase() === normalized ||
      def.label.toLowerCase() === normalized ||
      def.keywords.includes(normalized)
  );

  return found;
}
