import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { catEvents, instruments, surveillanceAlerts, venueRoutes, wal } from "../../db/schema.js";
import { HttpError, logAdmin } from "../../lib/exchange.js";
import { body, handle } from "../../lib/http.js";

export default handle(async (req: Request) => {
  const parts = new URL(req.url).pathname.split("/"); // /api/compliance/<view>/<id?>
  const view = parts[3];

  if (req.method === "PATCH" && view === "alerts") {
    const { status, reason, actor } = await body<{ status: string; reason?: string; actor?: string }>(req);
    if (!["open", "dismissed", "escalated"].includes(status)) throw new HttpError(400, "Invalid status");
    const [a] = await db.update(surveillanceAlerts).set({ status }).where(eq(surveillanceAlerts.id, Number(parts[4]))).returning();
    if (!a) throw new HttpError(404, "Alert not found");
    await logAdmin(actor ?? "compliance", `alert_${status}`, `alert:${a.id}`, reason ?? "");
    return a;
  }
  if (view === "alerts") {
    return db.select({ a: surveillanceAlerts, symbol: instruments.symbol }).from(surveillanceAlerts)
      .leftJoin(instruments, eq(surveillanceAlerts.instrumentId, instruments.id))
      .orderBy(desc(surveillanceAlerts.id)).limit(100)
      .then((r) => r.map((x) => ({ ...x.a, symbol: x.symbol })));
  }
  if (view === "cat") {
    return db.select({ c: catEvents, symbol: instruments.symbol }).from(catEvents)
      .leftJoin(instruments, eq(catEvents.instrumentId, instruments.id))
      .orderBy(desc(catEvents.id)).limit(150)
      .then((r) => r.map((x) => ({ ...x.c, symbol: x.symbol })));
  }
  if (view === "wal") return db.select().from(wal).orderBy(desc(wal.seq)).limit(150);
  if (view === "routes") return db.select().from(venueRoutes).orderBy(desc(venueRoutes.id)).limit(100);
  throw new HttpError(404, "Not found");
});

export const config: Config = { path: ["/api/compliance/:view", "/api/compliance/:view/:id"], method: ["GET", "PATCH"] };
