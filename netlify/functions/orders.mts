import type { Config } from "@netlify/functions";
import { cancelOrder, HttpError, recentOrders, submitOrder, type SubmitInput } from "../../lib/exchange.js";
import { actingParticipant, body, handle } from "../../lib/http.js";
import { ensureSeeded } from "../../lib/seed.js";

export default handle(async (req: Request) => {
  await ensureSeeded();
  const participantId = actingParticipant(req);
  const id = new URL(req.url).pathname.split("/")[3];

  if (req.method === "GET") {
    const rows = await recentOrders(participantId);
    return rows.map((r) => ({ ...r.o, symbol: r.symbol }));
  }
  if (req.method === "POST") {
    const b = await body<Omit<SubmitInput, "participantId">>(req);
    if (!b.symbol || !b.side || !b.type || b.qty == null) throw new HttpError(400, "symbol, side, type and qty are required");
    const result = await submitOrder({ ...b, participantId, source: "web" });
    return Response.json(result, { status: result.rejected.length ? 422 : 201 });
  }
  if (req.method === "DELETE" && id) return cancelOrder(Number(id), participantId);
  throw new HttpError(405, "Method not allowed");
});

export const config: Config = { path: ["/api/orders", "/api/orders/:id"], method: ["GET", "POST", "DELETE"] };
