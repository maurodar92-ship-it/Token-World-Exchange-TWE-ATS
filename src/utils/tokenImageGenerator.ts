import { TokenRecord, ChainType, NarrativeCategory, TokenStandard } from "../types";

// Chain specific visual design themes
interface ChainTheme {
  primary: string;
  secondary: string;
  accent: string;
  bgDark: string;
  ring: string;
  symbolColor: string;
  glyph: string;
}

const CHAIN_THEMES: Record<ChainType, ChainTheme> = {
  ethereum: {
    primary: "#627EEA",
    secondary: "#8A92B2",
    accent: "#00F0FF",
    bgDark: "#0A0D1A",
    ring: "#627EEA",
    symbolColor: "#E0E7FF",
    glyph: "M24 6 L12 24 L24 19 L36 24 Z M24 21 L12 26 L24 42 L36 26 Z",
  },
  base: {
    primary: "#0052FF",
    secondary: "#3B82F6",
    accent: "#60A5FA",
    bgDark: "#050C1F",
    ring: "#0052FF",
    symbolColor: "#DBEAFE",
    glyph: "M24 8 A16 16 0 1 0 40 24 H24 Z",
  },
  arbitrum: {
    primary: "#28A0F0",
    secondary: "#12AAFF",
    accent: "#00E5FF",
    bgDark: "#061320",
    ring: "#28A0F0",
    symbolColor: "#E0F2FE",
    glyph: "M14 34 L22 18 L27 27 L34 14",
  },
  polygon: {
    primary: "#8247E5",
    secondary: "#A855F7",
    accent: "#C084FC",
    bgDark: "#130A24",
    ring: "#8247E5",
    symbolColor: "#F3E8FF",
    glyph: "M24 10 L35 17 L35 31 L24 38 L13 31 L13 17 Z",
  },
  solana: {
    primary: "#9945FF",
    secondary: "#14F195",
    accent: "#00FFA3",
    bgDark: "#120824",
    ring: "#14F195",
    symbolColor: "#F5F3FF",
    glyph: "M12 16 L32 16 L36 12 L16 12 Z M16 26 L36 26 L32 22 L12 22 Z M12 36 L32 36 L36 32 L16 32 Z",
  },
  bitcoin: {
    primary: "#F7931A",
    secondary: "#FFB03A",
    accent: "#FDE047",
    bgDark: "#1C1003",
    ring: "#F7931A",
    symbolColor: "#FEF3C7",
    glyph: "M20 10 V38 M28 10 V38 M16 14 H28 C33 14 33 22 28 22 H16 M16 22 H30 C35 22 35 32 29 32 H16",
  },
  quantum: {
    primary: "#10B981",
    secondary: "#00F0FF",
    accent: "#34D399",
    bgDark: "#031410",
    ring: "#10B981",
    symbolColor: "#D1FAE5",
    glyph: "M24 10 A14 7 0 1 0 24 38 A14 7 0 1 0 24 10 M10 24 A7 14 0 1 0 38 24 A7 14 0 1 0 10 24",
  },
  cosmos: {
    primary: "#2E3148",
    secondary: "#5064FB",
    accent: "#6366F1",
    bgDark: "#0D0E18",
    ring: "#5064FB",
    symbolColor: "#E0E7FF",
    glyph: "M24 8 L32 24 L24 40 L16 24 Z M8 24 L24 16 L40 24 L24 32 Z",
  },
};

// Narrative color highlights
const NARRATIVE_ACCENTS: Record<string, string> = {
  ai_agents: "#00F0FF",
  depin: "#10B981",
  rwa: "#F59E0B",
  quantum_defi: "#8B5CF6",
  liquid_restaking: "#3B82F6",
  autonomous_worlds: "#EC4899",
};

/**
 * Generate deterministic pseudo-random hash from string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates an institutional, cyber-styled vector SVG for a token
 */
export function generateTokenSvg(token: Partial<TokenRecord>): string {
  const symbol = (token.symbol || "TOK").toUpperCase().trim();
  const name = token.name || "Token";
  const chain: ChainType = token.chain || "ethereum";
  const narrative = token.narrative || "quantum_defi";
  const standard = token.tokenStandard || "ERC-20";

  const theme = CHAIN_THEMES[chain] || CHAIN_THEMES.ethereum;
  const narrativeColor = NARRATIVE_ACCENTS[narrative] || theme.accent;

  const seedStr = `${token.id || ""}_${symbol}_${chain}_${token.contractAddress || ""}`;
  const seed = hashString(seedStr);

  const displayLetters = symbol.length <= 4 ? symbol : symbol.slice(0, 3);
  const fontSize = displayLetters.length <= 2 ? 18 : displayLetters.length === 3 ? 15 : 12;

  // Geometric variation based on seed
  const rotationAngle = (seed % 8) * 45;
  const patternIndex = seed % 4;

  const gradId = `tok_grad_${seed.toString(36)}`;
  const glowId = `tok_glow_${seed.toString(36)}`;
  const filterId = `tok_flt_${seed.toString(36)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <radialGradient id="${gradId}" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="${narrativeColor}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${theme.primary}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0.95"/>
    </radialGradient>
    <linearGradient id="${glowId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${narrativeColor}"/>
      <stop offset="50%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.secondary}"/>
    </linearGradient>
    <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="64" height="64" rx="14" fill="${theme.bgDark}"/>
  <rect width="64" height="64" rx="14" fill="url(#${gradId})" opacity="0.45"/>
  <rect width="62" height="62" x="1" y="1" rx="13" fill="none" stroke="url(#${glowId})" stroke-width="1.2" opacity="0.85"/>

  <!-- Dynamic Geometric Orbit/Background Grid -->
  <g opacity="0.25" stroke="${theme.secondary}" stroke-width="0.8" fill="none">
    ${patternIndex === 0 ? `
      <circle cx="32" cy="32" r="22" stroke-dasharray="3 3"/>
      <circle cx="32" cy="32" r="16"/>
    ` : patternIndex === 1 ? `
      <polygon points="32,10 52,48 12,48" stroke-dasharray="4 2"/>
      <circle cx="32" cy="32" r="18"/>
    ` : patternIndex === 2 ? `
      <rect x="14" y="14" width="36" height="36" rx="6" transform="rotate(${rotationAngle} 32 32)"/>
      <circle cx="32" cy="32" r="20" stroke-dasharray="2 4"/>
    ` : `
      <polygon points="32,10 50,21 50,43 32,54 14,43 14,21" stroke-dasharray="3 2"/>
      <circle cx="32" cy="32" r="15"/>
    `}
  </g>

  <!-- Inner Holographic Ring -->
  <circle cx="32" cy="32" r="21" fill="none" stroke="url(#${glowId})" stroke-width="1.5" stroke-dasharray="14 4 2 4" opacity="0.9"/>
  <circle cx="32" cy="32" r="17" fill="#0A0A0E" fill-opacity="0.82" stroke="#1F1F24" stroke-width="0.8"/>

  <!-- Token Symbol / Initials -->
  <text x="32" y="${32 + fontSize * 0.35}" 
        fill="${theme.symbolColor}" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="${fontSize}" 
        font-weight="800" 
        letter-spacing="0.5"
        text-anchor="middle"
        filter="url(#${filterId})">${displayLetters}</text>

  <!-- Micro-standard badge indicator -->
  <g transform="translate(43, 6)">
    <circle cx="6" cy="6" r="5" fill="${theme.bgDark}" stroke="${narrativeColor}" stroke-width="1"/>
    <circle cx="6" cy="6" r="2.5" fill="${narrativeColor}"/>
  </g>
</svg>`.trim();
}

/**
 * Returns a data URI suitable for <img src="..." />
 */
export function generateTokenDataUri(token: Partial<TokenRecord>): string {
  const svg = generateTokenSvg(token);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Enriches a TokenRecord with imageUrl and svgData if not already present
 */
export function ensureTokenHasImage(token: TokenRecord): TokenRecord {
  if (token.imageUrl && token.svgData) return token;

  const svg = token.svgData || generateTokenSvg(token);
  const uri = token.imageUrl || `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return {
    ...token,
    svgData: svg,
    imageUrl: uri,
  };
}
