import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { instruments } from "../../db/schema.js";
import { handle } from "../../lib/http.js";
import { effectivePrice, venueMode, venueQuotes, VENUES } from "../../lib/venues.js";

export default handle(async (req: Request) => {
  const symbol = new URL(req.url).searchParams.get("symbol");
  // Only env var names are exposed, never their values.
  const venues = VENUES.map((v) => ({ ...v, mode: venueMode(v, process.env) }));
  if (!symbol) return { venues };
  const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
  if (!inst) return { venues, quotes: [] };
  const quotes = venueQuotes(inst.symbol, inst.assetClass, inst.refPriceCents, inst.tickCents).map((q) => ({
    ...q,
    effBuyCents: effectivePrice("buy", { venue: q.venue, priceCents: q.askCents, qty: q.askQty, feeBps: q.feeBps, fillProbability: q.fillProbability, settlementMinutes: q.settlementMinutes }) / 100,
    effSellCents: effectivePrice("sell", { venue: q.venue, priceCents: q.bidCents, qty: q.bidQty, feeBps: q.feeBps, fillProbability: q.fillProbability, settlementMinutes: q.settlementMinutes }) / 100,
  }));
  return { venues, quotes };
});

export const config: Config = { path: "/api/venues", method: "GET" };
