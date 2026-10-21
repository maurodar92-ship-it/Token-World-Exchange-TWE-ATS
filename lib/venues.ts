// Execution venue adapters + smart order router.
//
// Each adapter exposes the same contract. In the sandbox every venue quotes from a
// deterministic simulator; an adapter reports `credentials_configured` once its env vars are
// present, but order transmission stays simulated until the connector has passed the venue's
// certification (FIX conformance / API UAT).

export interface VenueDef {
  id: string;
  name: string;
  operator: string;
  protocol: string;
  assetClasses: string[];
  feeBps: number;
  settlementMinutes: number;
  fillProbability: number; // 0..1, historical fill-rate estimate used in best-ex scoring
  settlement: string;
  credentialEnv: string[];
}

export const VENUES: VenueDef[] = [
  {
    id: "SECM", name: "Securitize Markets", operator: "Securitize Markets, LLC",
    protocol: "FIX 4.4 + REST (DS Protocol book-entry sync)", assetClasses: ["equity", "fund_lp", "debt"],
    feeBps: 35, settlementMinutes: 60, fillProbability: 0.82, settlement: "Transfer-agent book entry (DS Token)",
    credentialEnv: ["SECURITIZE_MARKETS_API_KEY", "SECURITIZE_MARKETS_API_SECRET"],
  },
  {
    id: "TZRO", name: "tZERO ATS", operator: "tZERO ATS, LLC",
    protocol: "FIX 4.4", assetClasses: ["equity", "crypto"],
    feeBps: 25, settlementMinutes: 30, fillProbability: 0.78, settlement: "ERC-1404 settlement bridge",
    credentialEnv: ["TZERO_FIX_SENDER_COMP_ID", "TZERO_FIX_PASSWORD"],
  },
  {
    id: "INXS", name: "INX Securities ATS", operator: "INX Securities, LLC",
    protocol: "FIX 4.4", assetClasses: ["equity", "debt", "crypto"],
    feeBps: 30, settlementMinutes: 15, fillProbability: 0.74, settlement: "On-chain (EVM) crossing",
    credentialEnv: ["INX_API_KEY", "INX_API_SECRET"],
  },
  {
    id: "OASP", name: "Oasis Pro Markets", operator: "Oasis Pro Markets, LLC",
    protocol: "REST + WebSocket", assetClasses: ["equity", "debt", "real_estate", "crypto"],
    feeBps: 28, settlementMinutes: 5, fillProbability: 0.7, settlement: "Multi-chain atomic USDC / fiat",
    credentialEnv: ["OASIS_PRO_API_KEY"],
  },
  {
    id: "FIGR", name: "Figure ATS", operator: "Figure Securities, Inc.",
    protocol: "REST (Provenance Blockchain)", assetClasses: ["equity", "debt", "fund_lp"],
    feeBps: 20, settlementMinutes: 2, fillProbability: 0.66, settlement: "Provenance omnibus custody",
    credentialEnv: ["FIGURE_API_KEY"],
  },
  {
    id: "TXTR", name: "Texture Capital", operator: "Texture Capital, Inc.",
    protocol: "DMA REST", assetClasses: ["equity", "fund_lp"],
    feeBps: 40, settlementMinutes: 120, fillProbability: 0.6, settlement: "Transfer-agent book entry",
    credentialEnv: ["TEXTURE_API_KEY"],
  },
  {
    id: "PPEX", name: "PPEX ATS (North Capital)", operator: "North Capital Private Securities Corp.",
    protocol: "TransactAPI REST + FIX", assetClasses: ["equity", "debt", "real_estate", "fund_lp"],
    feeBps: 45, settlementMinutes: 1440, fillProbability: 0.68, settlement: "Escrow + custodial ledger",
    credentialEnv: ["NORTHCAPITAL_CLIENT_ID", "NORTHCAPITAL_DEVELOPER_API_KEY"],
  },
];

export function venueMode(v: VenueDef, env: Record<string, string | undefined>): "simulated" | "credentials_configured" {
  return v.credentialEnv.every((k) => !!env[k]) ? "credentials_configured" : "simulated";
}

// Small deterministic PRNG (FNV-1a hash -> mulberry32) so quotes are reproducible per time bucket.
function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface VenueQuote {
  venue: string;
  name: string;
  bidCents: number;
  bidQty: number;
  askCents: number;
  askQty: number;
  feeBps: number;
  fillProbability: number;
  settlementMinutes: number;
}

export const QUOTE_BUCKET_MS = 15_000;

export function venueQuotes(
  symbol: string, assetClass: string, refPriceCents: number, tickCents: number, now = Date.now(),
): VenueQuote[] {
  const bucket = Math.floor(now / QUOTE_BUCKET_MS);
  return VENUES.filter((v) => v.assetClasses.includes(assetClass)).map((v) => {
    const r = seeded(`${v.id}:${symbol}:${bucket}`);
    const mid = refPriceCents * (1 + (r() - 0.5) * 0.012);
    const halfSpread = Math.max(tickCents, refPriceCents * (0.002 + r() * 0.006));
    const snap = (x: number) => Math.max(tickCents, Math.round(x / tickCents) * tickCents);
    const size = () => Math.max(1, Math.round((50 + r() * 450) * (10_000 / Math.max(refPriceCents, 100)) ** 0.5));
    return {
      venue: v.id, name: v.name,
      bidCents: snap(mid - halfSpread), bidQty: size(),
      askCents: snap(mid + halfSpread), askQty: size(),
      feeBps: v.feeBps, fillProbability: v.fillProbability, settlementMinutes: v.settlementMinutes,
    };
  });
}

// --- Best-execution scoring (FINRA Rule 5310 factors: price, cost, likelihood of execution, speed of settlement) ---

export interface Liquidity {
  venue: string; // "TWE" for the internal book
  priceCents: number;
  qty: number;
  feeBps: number;
  fillProbability: number;
  settlementMinutes: number;
}

/** Effective all-in price in hundredths of a cent, adjusted for cost, fill risk and settlement latency. */
export function effectivePrice(side: "buy" | "sell", l: Liquidity): number {
  const sign = side === "buy" ? 1 : -1;
  const feeAdj = (l.priceCents * l.feeBps) / 10_000;
  const riskBps = (1 - l.fillProbability) * 20 + Math.log10(1 + l.settlementMinutes) * 2;
  const riskAdj = (l.priceCents * riskBps) / 10_000;
  return Math.round((l.priceCents + sign * (feeAdj + riskAdj)) * 100);
}

export interface Allocation extends Liquidity { allocQty: number; score: number }

export function routeOrder(
  side: "buy" | "sell", qty: number, limitCents: number | null, liquidity: Liquidity[],
): { allocations: Allocation[]; unallocated: number } {
  const ranked = liquidity
    .filter((l) => l.qty > 0)
    .filter((l) => limitCents === null || (side === "buy" ? l.priceCents <= limitCents : l.priceCents >= limitCents))
    .map((l) => ({ ...l, score: effectivePrice(side, l) }))
    // Ties go to the internal book, then to the venue with the higher fill probability.
    .sort((a, b) => (side === "buy" ? a.score - b.score : b.score - a.score)
      || (a.venue === "TWE" ? -1 : b.venue === "TWE" ? 1 : b.fillProbability - a.fillProbability));

  let remaining = qty;
  const allocations: Allocation[] = [];
  for (const l of ranked) {
    if (remaining === 0) break;
    const allocQty = Math.min(remaining, l.qty);
    allocations.push({ ...l, allocQty });
    remaining -= allocQty;
  }
  return { allocations, unallocated: remaining };
}

/** Deterministic simulated venue response for a routed child order. */
export function simulateVenueFill(venue: string, parentKey: string, fillProbability: number): boolean {
  return seeded(`fill:${venue}:${parentKey}`)() < fillProbability;
}
