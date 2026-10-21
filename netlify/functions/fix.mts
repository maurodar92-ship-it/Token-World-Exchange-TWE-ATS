import type { Config } from "@netlify/functions";
import { HttpError, submitOrder } from "../../lib/exchange.js";
import { encodeFix, parseFix } from "../../lib/fix.js";
import { handle } from "../../lib/http.js";
import { ensureSeeded } from "../../lib/seed.js";

const SIDE: Record<string, "buy" | "sell"> = { "1": "buy", "2": "sell" };
const TYPE: Record<string, "market" | "limit"> = { "1": "market", "2": "limit" };
const TIF: Record<string, "day" | "gtc" | "ioc"> = { "0": "day", "1": "gtc", "3": "ioc" };

// FIX-over-HTTPS order entry for the sandbox. A production FIX engine runs persistent
// TCP sessions (Logon/Heartbeat/ResendRequest); this endpoint accepts a single NewOrderSingle.
export default handle(async (req: Request) => {
  await ensureSeeded();
  const raw = await req.text();
  const parsed = parseFix(raw);
  const f = parsed.fields;
  const reject = (text: string, refTag?: number) => Response.json({
    accepted: false, errors: [text],
    fix: [encodeFix({ msgType: "3", sender: "TWEATS", target: f.get(49) ?? "UNKNOWN", seqNum: 1 }, [
      [45, f.get(34) ?? "0"], ...(refTag ? [[371, refTag] as [number, number]] : []), [372, f.get(35) ?? ""], [58, text],
    ], "|")],
  }, { status: 400 });

  if (!parsed.valid) return reject(parsed.errors.join("; "));
  if (f.get(35) !== "D") return reject("Only NewOrderSingle (35=D) is accepted on this endpoint", 35);
  for (const tag of [49, 11, 55, 54, 38, 40]) if (!f.get(tag)) return reject(`Required tag ${tag} missing`, tag);
  if (!SIDE[f.get(54)!]) return reject("Unsupported Side (54)", 54);
  if (!TYPE[f.get(40)!]) return reject("Unsupported OrdType (40)", 40);
  const price = f.get(44);
  const result = await submitOrder({
    participantId: f.get(49)!, clOrdId: f.get(11)!, symbol: f.get(55)!, side: SIDE[f.get(54)!], type: TYPE[f.get(40)!],
    tif: TIF[f.get(59) ?? "1"] ?? "gtc", qty: Number(f.get(38)), priceCents: price ? Math.round(Number(price) * 100) : null,
    routing: f.get(100) === "SOR" ? "sor" : "internal", source: "fix",
  }).catch((e) => { if (e instanceof HttpError) return e; throw e; });
  if (result instanceof HttpError) return reject(result.message);
  return { accepted: result.rejected.length === 0, ...result };
});

export const config: Config = { path: "/api/fix", method: "POST" };
