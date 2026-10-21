import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { instruments, settlements } from "../../db/schema.js";
import { HttpError, runSettlementBatch } from "../../lib/exchange.js";
import { handle } from "../../lib/http.js";

export default handle(async (req: Request) => {
  if (req.method === "POST") {
    const results = await runSettlementBatch(true);
    return { processed: results.length, settled: results.filter((r) => r?.status === "settled").length, failed: results.filter((r) => r?.status === "failed").length };
  }
  if (req.method === "GET") {
    return db.select({ s: settlements, symbol: instruments.symbol }).from(settlements)
      .innerJoin(instruments, eq(settlements.instrumentId, instruments.id))
      .orderBy(desc(settlements.id)).limit(120)
      .then((r) => r.map((x) => ({ ...x.s, symbol: x.symbol })));
  }
  throw new HttpError(405, "Method not allowed");
});

export const config: Config = { path: "/api/settlements", method: ["GET", "POST"] };
