import {
  TokenRecord,
  NarrativeCategory,
  Web3Genre,
  resolveTokenGenre,
  GENRE_DEFINITIONS,
} from "../types";

export const ALL_NARRATIVES: { id: NarrativeCategory; label: string; badgeColor: string; description: string }[] = [
  {
    id: "ai_agents",
    label: "AI Agents & Swarms",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description: "Autonomous reasoning agents, on-chain inference networks, and multi-agent coordination layers.",
  },
  {
    id: "depin",
    label: "DePIN (Physical Infra)",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: "Decentralized compute clusters, wireless edge bandwidth, GPU networks, and IoT sensor arrays.",
  },
  {
    id: "rwa",
    label: "RWA (Real-World Assets)",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description: "Tokenized carbon credits, fractional real estate, treasury bills, and high-frequency trade yields.",
  },
  {
    id: "quantum_defi",
    label: "Quantum-Resistant DeFi",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    description: "Post-quantum lattice cryptography, Falcon-512 signatures, and zk-SNARK shielded pools.",
  },
  {
    id: "liquid_restaking",
    label: "Liquid Restaking",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description: "Actively Validated Services (AVS), multi-asset restaking vaults, and pooled proof-of-stake derivative tokens.",
  },
  {
    id: "autonomous_worlds",
    label: "Autonomous Worlds",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description: "Fully on-chain physics simulation, dynamic NFT items, and verifiable agent economies.",
  },
];

export const ALL_GENRES: { id: Web3Genre; label: string; badgeColor: string; description: string }[] = [
  {
    id: "defi_liquidity",
    label: "DeFi Liquidity & Vaults",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    description: GENRE_DEFINITIONS.defi_liquidity.description,
  },
  {
    id: "onchain_identity",
    label: "Identity & Vanity IDs",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description: GENRE_DEFINITIONS.onchain_identity.description,
  },
  {
    id: "gaming_media",
    label: "Gaming & Digital Media",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description: GENRE_DEFINITIONS.gaming_media.description,
  },
  {
    id: "depin_infra",
    label: "DePIN Infrastructure",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: GENRE_DEFINITIONS.depin_infra.description,
  },
];

export const NARRATIVE_TAGS_MAP: Record<NarrativeCategory, string[]> = {
  ai_agents: [
    "Autonomous Agent Swarm",
    "On-Chain LLM Inference",
    "Neural Model Weights",
    "Agentic Micro-Payments",
    "Synthetic Data Oracle",
    "Decentralized AI Router",
    "Cognitive State Mesh",
    "Autonomous Trading Bot",
    "AI Agent DAO",
    "Multi-Agent Coordination",
    "Zero-Knowledge Inference Proof",
    "On-Chain Memory Vector",
  ],
  depin: [
    "Decentralized GPU Cluster",
    "Wireless Proof-of-Coverage",
    "IoT Telemetry Node",
    "Edge Bandwidth Relay",
    "Micro-Grid Energy Settlement",
    "Compute Mesh Protocol",
    "Hardware Node Attestation",
    "5G Small-Cell Network",
    "Decentralized Sensor Grid",
    "Vehicle Telemetry Stream",
    "Distributed Storage Pinning",
    "Edge-AI Compute Node",
  ],
  rwa: [
    "Tokenized US Treasuries",
    "Institutional Private Credit",
    "Commodity Asset Oracle",
    "Real Estate Fractional Vault",
    "Cross-Border Invoice Settlement",
    "High-Yield Debt Basket",
    "Regulated Green Bond",
    "Physical Gold Backing",
    "Sovereign Debt Index",
    "Trade Finance Escrow",
    "Municipal Bond Synthetic",
    "Private Equity SPV",
  ],
  quantum_defi: [
    "Post-Quantum Kyber Lattice",
    "Zero-Knowledge Snark Rollup",
    "Threshold FHE Compute",
    "Falcon-512 Signature",
    "Shielded Liquidity Pool",
    "Homomorphic Encryption State",
    "Quantum Entropy Bridge",
    "Dilithium Auth Key",
    "Recursive ZK-STARK",
    "Lattice Cryptographic Safe",
    "Quantum Random Beacon",
    "Multi-Party Computation (MPC)",
  ],
  liquid_restaking: [
    "EigenLayer AVS Operator",
    "Dual-Staking Restaked Vault",
    "Sequencer Revenue Sharing",
    "Modular Data Availability",
    "Symbiotic Restake Collateral",
    "Pooled PoS Derivative",
    "Slashing Insurance Shield",
    "LRT Yield Optimizer",
    "Cross-Chain Restake Router",
    "Validator Mesh Network",
    "Restaked Liquidity Hub",
    "Shared Security Protocol",
  ],
  autonomous_worlds: [
    "Fully On-Chain Physics",
    "ERC-6551 Token Bound Account",
    "Generative SVG Dynamic Trait",
    "Autonomous World DAO",
    "Cross-Game Metaverse Loot",
    "Procedural Economy Engine",
    "Soulbound Gaming Relic",
    "Autonomous Virtual Sovereign",
    "Lootverse Expansion Standard",
    "On-Chain Battle State Machine",
    "Verifiable Random Loot",
    "World-State Consensus Core",
  ],
};

export const GENRE_TAGS_MAP: Record<Web3Genre, string[]> = {
  defi_liquidity: [
    "Concentrated AMM Liquidity",
    "Auto-Compounding Vault",
    "Flash-Loan Shielded",
    "Multi-Collateral Debt",
    "Tick-Range Position",
    "Delta-Neutral Arbitrage",
  ],
  onchain_identity: [
    "EIP-4337 Smart Account",
    "Deterministic Vanity Hash",
    "Soulbound Attestation",
    "Universal Reverse Resolver",
    "Biometric Passkey Safe",
    "Decentralized DID Registry",
  ],
  gaming_media: [
    "Dynamic Trait Evolution",
    "ERC-1155 Batch Crafting",
    "Pure On-Chain SVG Artifact",
    "Zero-Royalty Immunity",
    "Composable Game Asset",
    "Generative Pixel Shader",
  ],
  depin_infra: [
    "Zero-Knowledge Hardware PoC",
    "Microsecond Stream Settlement",
    "Distributed GPU Inference",
    "Decentralized Radio Mesh",
    "Bandwidth Credit Unit",
    "Sensor Stream Telemetry",
  ],
};

export const ORGANIC_MARKET_EVENTS: string[] = [
  "Community protocol proposal pivoted development towards sector expansion",
  "Institutional capital influx triggered narrative re-alignment and liquidity expansion",
  "Mainnet protocol upgrade integrated cross-chain decentralized architecture",
  "Decentralized autonomous organization voted to allocate treasury to new sector initiative",
  "Strategic ecosystem merger unified protocol liquidity with emerging market sector",
  "Zero-knowledge proof verification deployed to secure new protocol utility",
  "Modular data availability layer adopted for scalable low-latency settlement",
  "Organic market adoption driven by high-throughput on-chain participant demand",
  "Ecosystem grant program successfully launched high-performance infrastructure tools",
  "Algorithmic market maker rebalanced deep liquidity towards newly adopted utility",
];

export interface MarketEvolutionOptions {
  narrativeMode: "random_all" | "selected_narratives" | "keep_current";
  targetNarratives?: NarrativeCategory[];
  genreMode: "auto_resolve" | "random_all" | "selected_genres" | "keep_current";
  targetGenres?: Web3Genre[];
  assignTags: boolean;
  tagCount: 1 | 2 | 3 | "random";
  simulatePriceVolatility: boolean;
  volatilityIntensity: "mild" | "moderate" | "wild"; // mild (±2-8%), moderate (±8-22%), wild (±20-55%)
  appendEvolutionNote: boolean;
}

export interface TokenEvolutionResult {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  previousNarrative: NarrativeCategory;
  newNarrative: NarrativeCategory;
  previousGenre?: Web3Genre;
  newGenre: Web3Genre;
  assignedTags: string[];
  previousPriceUsd: number;
  newPriceUsd: number;
  priceDeltaPercent: number;
  previousMarketCap: number;
  newMarketCap: number;
  marketEvolutionNote?: string;
}

export function sampleRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function sampleMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Simulates organic market development across a batch of tokens by randomly assigning
 * new narratives, genres, and specialized organic market tags.
 */
export function simulateTokenOrganicEvolution(
  tokens: TokenRecord[],
  options: MarketEvolutionOptions
): { updatedTokens: TokenRecord[]; results: TokenEvolutionResult[] } {
  const updatedTokens: TokenRecord[] = [];
  const results: TokenEvolutionResult[] = [];

  const narrativePool =
    options.narrativeMode === "selected_narratives" &&
    options.targetNarratives &&
    options.targetNarratives.length > 0
      ? options.targetNarratives
      : (ALL_NARRATIVES.map((n) => n.id) as NarrativeCategory[]);

  const genrePool =
    options.genreMode === "selected_genres" &&
    options.targetGenres &&
    options.targetGenres.length > 0
      ? options.targetGenres
      : (ALL_GENRES.map((g) => g.id) as Web3Genre[]);

  for (const token of tokens) {
    const previousNarrative = token.narrative;
    const previousGenre = token.genre || resolveTokenGenre(token);

    // 1. Resolve new narrative
    let newNarrative: NarrativeCategory = previousNarrative;
    if (options.narrativeMode !== "keep_current") {
      newNarrative = sampleRandom(narrativePool);
    }

    // 2. Resolve new genre
    let newGenre: Web3Genre = previousGenre;
    if (options.genreMode === "auto_resolve") {
      newGenre = resolveTokenGenre({
        narrative: newNarrative,
        isVanity: token.isVanity,
        tokenStandard: token.tokenStandard,
      });
    } else if (options.genreMode === "random_all" || options.genreMode === "selected_genres") {
      newGenre = sampleRandom(genrePool);
    }

    // 3. Assign organic market tags
    let assignedTags: string[] = token.tags ? [...token.tags] : [];
    if (options.assignTags) {
      const narrativeTags = NARRATIVE_TAGS_MAP[newNarrative] || [];
      const genreTags = GENRE_TAGS_MAP[newGenre] || [];
      const combinedTagPool = Array.from(new Set([...narrativeTags, ...genreTags]));

      let desiredTagCount = 2;
      if (options.tagCount === "random") {
        desiredTagCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 tags
      } else {
        desiredTagCount = options.tagCount;
      }

      assignedTags = sampleMultiple(combinedTagPool, desiredTagCount);
    }

    // 4. Price & Market Cap organic volatility simulation
    let newPriceUsd = token.priceUsd;
    let newMarketCap = token.marketCap;
    let priceDeltaPercent = 0;

    if (options.simulatePriceVolatility) {
      let maxDelta = 0.15; // default moderate
      if (options.volatilityIntensity === "mild") maxDelta = 0.08;
      if (options.volatilityIntensity === "wild") maxDelta = 0.45;

      // Realistic market swing: -maxDelta to +maxDelta with slight upward momentum for active development
      const rawSwing = (Math.random() * 2 - 0.9) * maxDelta;
      priceDeltaPercent = +(rawSwing * 100).toFixed(2);

      const multiplier = Math.max(0.1, 1 + rawSwing);
      newPriceUsd = +(token.priceUsd * multiplier).toFixed(4);
      newMarketCap = Math.round(token.marketCap * multiplier);
    }

    // 5. Market development event note
    const marketEvolutionNote = options.appendEvolutionNote
      ? sampleRandom(ORGANIC_MARKET_EVENTS)
      : token.marketEvolutionNote;

    const updatedToken: TokenRecord = {
      ...token,
      narrative: newNarrative,
      genre: newGenre,
      tags: assignedTags,
      priceUsd: newPriceUsd,
      marketCap: newMarketCap,
      marketEvolutionNote,
    };

    updatedTokens.push(updatedToken);
    results.push({
      tokenId: token.id,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      previousNarrative,
      newNarrative,
      previousGenre,
      newGenre,
      assignedTags,
      previousPriceUsd: token.priceUsd,
      newPriceUsd,
      priceDeltaPercent,
      previousMarketCap: token.marketCap,
      newMarketCap,
      marketEvolutionNote,
    });
  }

  return { updatedTokens, results };
}
