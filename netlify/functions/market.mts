import type { Config } from "@netlify/functions";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { executions, instruments, orders } from "../../db/schema.js";
import { ensureSeeded } from "../../lib/seed.js";
import { aggregateLevels, type Side } from "../../lib/matching.js";
import { HttpError } from "../../lib/exchange.js";
import { handle } from "../../lib/http.js";

async function instrumentsWithStats() {
  const since = new Date(Date.now() - 24 * 3600_000);
  const stats = await db.select({
    instrumentId: executions.instrumentId,
    volume: sql<string>`sum(${executions.qty})`,
    first: sql<number>`(array_agg(${executions.priceCents} order by ${executions.id}))[1]`,
    trades: sql<string>`count(*)`,
  }).from(executions).where(gte(executions.createdAt, since)).groupBy(executions.instrumentId);
  const byId = new Map(stats.map((s) => [s.instrumentId, s]));
  const list = await db.select().from(instruments).orderBy(instruments.id);
  return list.map((i) => {
    const s = byId.get(i.id);
    return { ...i, volume24h: Number(s?.volume ?? 0), open24hCents: s?.first ?? i.refPriceCents, trades24h: Number(s?.trades ?? 0) };
  });
}

export default handle(async (req: Request) => {
  const url = new URL(req.url);
  const [, , resource, symbol] = url.pathname.split("/"); // /api/<resource>/<symbol>
  await ensureSeeded();

  if (resource === "instruments") return instrumentsWithStats();

  const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, decodeURIComponent(symbol ?? "")));
  if (!inst) throw new HttpError(404, "Unknown instrument");

  if (resource === "book") {
    const rows = await db.select().from(orders).where(and(
      eq(orders.instrumentId, inst.id), inArray(orders.status, ["new", "partially_filled"]),
    ));
    const resting = rows.map((r) => ({ id: r.id, participantId: r.participantId, side: r.side as Side, priceCents: r.priceCents!, leavesQty: r.leavesQty, seq: r.seq }));
    // L2 only: Reg ATS 301(b)(10) confidential treatment — subscriber identities are never disseminated.
    return {
      symbol: inst.symbol, status: inst.status, refPriceCents: inst.refPriceCents, tickCents: inst.tickCents,
      bids: aggregateLevels(resting, "buy"), asks: aggregateLevels(resting, "sell"), ts: Date.now(),
    };
  }

  if (resource === "trades") {
    const tape = await db.select({
      id: executions.id, priceCents: executions.priceCents, qty: executions.qty, aggressorSide: executions.aggressorSide,
      venue: executions.venue, createdAt: executions.createdAt,
    }).from(executions).where(eq(executions.instrumentId, inst.id)).orderBy(desc(executions.id)).limit(40);
    const bucketMin = Number(url.searchParams.get("bucket") ?? 5);
    const candles = await db.execute<{ t: string; o: number; h: number; l: number; c: number; v: string }>(sql`
      select extract(epoch from date_bin(${`${bucketMin} minutes`}::interval, created_at, timestamp '2000-01-01')) * 1000 as t,
        (array_agg(price_cents order by id))[1] as o, max(price_cents) as h, min(price_cents) as l,
        (array_agg(price_cents order by id desc))[1] as c, sum(qty) as v
      from executions where instrument_id = ${inst.id} and created_at > now() - interval '8 hours'
      group by 1 order by 1`);
    const rows = Array.isArray(candles) ? candles : (candles as { rows: unknown[] }).rows;
    return {
      tape,
      candles: (rows as { t: string; o: number; h: number; l: number; c: number; v: string }[])
        .map((r) => ({ t: Number(r.t), o: Number(r.o), h: Number(r.h), l: Number(r.l), c: Number(r.c), v: Number(r.v) })),
    };
  }

  throw new HttpError(404, "Not found");
});

export const config: Config = {
  path: ["/api/instruments", "/api/book/:symbol", "/api/trades/:symbol"],
  method: "GET",
};
