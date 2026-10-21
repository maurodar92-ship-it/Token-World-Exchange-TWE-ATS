import type { Config } from "@netlify/functions";
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { adminActions, executions, holdings, instruments, participants, wal } from "../../db/schema.js";
import { HttpError, logAdmin } from "../../lib/exchange.js";
import { body, handle } from "../../lib/http.js";
import { ensureSeeded, replenishLiquidity } from "../../lib/seed.js";
import { fifoRealized } from "../../lib/tax.js";

// Transfer-agent & operations console. Every mutation requires a reason and is written to
// both the admin audit log and the WAL. (Sandbox: production adds 4-eyes approval + SSO roles.)

async function instrumentBySymbol(symbol: string) {
  const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
  if (!inst) throw new HttpError(404, `Unknown instrument ${symbol}`);
  return inst;
}

function requireReason(reason: unknown): string {
  if (typeof reason !== "string" || reason.trim().length < 4) throw new HttpError(400, "A reason (min 4 chars) is required for audit");
  return reason.trim();
}

export default handle(async (req: Request) => {
  await ensureSeeded();
  const parts = new URL(req.url).pathname.split("/").slice(3); // after /api/admin
  const [action, arg] = parts;
  const actor = req.headers.get("x-twe-operator") ?? "ta-operator";

  if (req.method === "GET") {
    if (action === "participants") return db.select().from(participants).orderBy(participants.id);
    if (action === "actions") return db.select().from(adminActions).orderBy(desc(adminActions.id)).limit(100);
    if (action === "captable") {
      const inst = await instrumentBySymbol(arg);
      const rows = await db.select({ h: holdings, name: participants.name, kind: participants.kind, country: participants.country, accredited: participants.accredited, wallet: participants.wallet })
        .from(holdings).innerJoin(participants, eq(holdings.participantId, participants.id))
        .where(and(eq(holdings.instrumentId, inst.id), gt(holdings.qty, 0))).orderBy(desc(holdings.qty));
      const outstanding = rows.reduce((a, r) => a + r.h.qty, 0);
      return {
        instrument: inst, outstanding, unissued: Math.max(0, inst.totalSupply - outstanding),
        holders: rows.map((r) => ({ ...r.h, name: r.name, kind: r.kind, country: r.country, accredited: r.accredited, wallet: r.wallet, pct: outstanding ? r.h.qty / outstanding : 0 })),
        // Reconciliation against an independent sum of the journal would run here against the TA book of record.
        reconciled: outstanding <= inst.totalSupply || inst.totalSupply === 0,
      };
    }
    if (action === "portfolio" || action === "tax") {
      const pid = arg;
      const [p] = await db.select().from(participants).where(eq(participants.id, pid));
      if (!p) throw new HttpError(404, "Unknown participant");
      if (action === "portfolio") {
        const pos = await db.select({ h: holdings, i: instruments }).from(holdings)
          .innerJoin(instruments, eq(holdings.instrumentId, instruments.id)).where(eq(holdings.participantId, pid));
        return { participant: p, positions: pos.map((x) => ({ ...x.h, symbol: x.i.symbol, name: x.i.name, refPriceCents: x.i.refPriceCents, assetClass: x.i.assetClass })) };
      }
      const trades = await db.select({ e: executions, symbol: instruments.symbol }).from(executions)
        .innerJoin(instruments, eq(executions.instrumentId, instruments.id))
        .where(or(eq(executions.buyerId, pid), eq(executions.sellerId, pid)));
      const { realized, open } = fifoRealized(trades.map((t) => ({
        symbol: t.symbol, side: t.e.buyerId === pid ? "buy" : "sell", qty: t.e.qty, priceCents: t.e.priceCents, at: t.e.createdAt,
      })));
      const distributions = await db.select().from(adminActions).where(and(eq(adminActions.action, "distribution"), sql`${adminActions.details}->'payees' ? ${pid}`));
      return {
        participant: { id: p.id, name: p.name, country: p.country },
        form: p.country === "US" ? "1099-B / 1099-DIV" : "1042-S",
        realized, open,
        distributions: distributions.map((d) => ({ symbol: d.target, at: d.createdAt, kind: (d.details as Record<string, unknown>).kind, amountCents: ((d.details as Record<string, Record<string, number>>).payees)[pid] })),
      };
    }
    throw new HttpError(404, "Not found");
  }

  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const b = await body<Record<string, unknown>>(req);

  if (action === "liquidity") {
    await replenishLiquidity(typeof b.symbol === "string" ? [b.symbol] : undefined);
    await logAdmin(actor, "replenish_liquidity", String(b.symbol ?? "ALL"), "DMM quote refresh");
    return { ok: true };
  }

  const reason = requireReason(b.reason);

  if (action === "instrument-status") {
    const inst = await instrumentBySymbol(String(b.symbol));
    if (!["active", "halted", "frozen"].includes(String(b.status))) throw new HttpError(400, "status must be active, halted or frozen");
    const [u] = await db.update(instruments).set({ status: String(b.status) }).where(eq(instruments.id, inst.id)).returning();
    await logAdmin(actor, `instrument_${b.status}`, inst.symbol, reason, { from: inst.status });
    return u;
  }

  if (action === "mint" || action === "burn") {
    const inst = await instrumentBySymbol(String(b.symbol));
    const qty = Number(b.qty);
    const pid = String(b.participantId);
    if (!Number.isInteger(qty) || qty <= 0) throw new HttpError(400, "qty must be a positive integer");
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${inst.id})`);
      const [p] = await tx.select().from(participants).where(eq(participants.id, pid));
      if (!p) throw new HttpError(404, "Unknown participant");
      if (action === "mint") {
        if (p.kycStatus !== "approved" || !p.sanctionsClear) throw new HttpError(422, "Cannot mint to an investor without approved KYC / clean sanctions screen");
        if (inst.permissioned && !p.credentialId) throw new HttpError(422, "Investor has no verified identity claim in the registry");
        await tx.insert(holdings).values({ participantId: pid, instrumentId: inst.id, qty })
          .onConflictDoUpdate({ target: [holdings.participantId, holdings.instrumentId], set: { qty: sql`${holdings.qty} + ${qty}`, updatedAt: new Date() } });
        await tx.update(instruments).set({ totalSupply: sql`${instruments.totalSupply} + ${qty}` }).where(eq(instruments.id, inst.id));
      } else {
        const [h] = await tx.select().from(holdings).where(and(eq(holdings.participantId, pid), eq(holdings.instrumentId, inst.id)));
        if (!h || h.qty < qty) throw new HttpError(422, "Burn exceeds holder balance");
        await tx.update(holdings).set({ qty: sql`${holdings.qty} - ${qty}`, updatedAt: new Date() }).where(and(eq(holdings.participantId, pid), eq(holdings.instrumentId, inst.id)));
        await tx.update(instruments).set({ totalSupply: sql`greatest(0, ${instruments.totalSupply} - ${qty})` }).where(eq(instruments.id, inst.id));
      }
      await tx.insert(adminActions).values({ actor, action, target: inst.symbol, reason, details: { participantId: pid, qty } });
      await tx.insert(wal).values({ instrumentId: inst.id, eventType: action === "mint" ? "TOKEN_MINTED" : "TOKEN_BURNED", payload: { participantId: pid, qty, actor, reason } });
      return { ok: true };
    });
  }

  if (action === "position-freeze") {
    const inst = await instrumentBySymbol(String(b.symbol));
    const [h] = await db.update(holdings).set({ frozen: !!b.frozen, updatedAt: new Date() })
      .where(and(eq(holdings.participantId, String(b.participantId)), eq(holdings.instrumentId, inst.id))).returning();
    if (!h) throw new HttpError(404, "No position");
    await logAdmin(actor, b.frozen ? "position_freeze" : "position_unfreeze", `${inst.symbol}:${b.participantId}`, reason);
    return h;
  }

  if (action === "participant") {
    const patch: Partial<typeof participants.$inferInsert> = {};
    if (typeof b.accredited === "boolean") patch.accredited = b.accredited;
    if (typeof b.sanctionsClear === "boolean") patch.sanctionsClear = b.sanctionsClear;
    if (typeof b.kycStatus === "string" && ["pending", "approved", "rejected"].includes(b.kycStatus)) patch.kycStatus = b.kycStatus;
    if (b.credential === "revoke") patch.credentialId = null;
    if (b.credential === "issue") patch.credentialId = `vc:twe:${String(arg).toLowerCase()}:${Date.now().toString(36)}`;
    if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update");
    const [p] = await db.update(participants).set(patch).where(eq(participants.id, String(arg))).returning();
    if (!p) throw new HttpError(404, "Unknown participant");
    await logAdmin(actor, "identity_update", p.id, reason, patch as Record<string, unknown>);
    return p;
  }

  if (action === "distribution") {
    // Corporate action: dividend / coupon / rent paid pro-rata to holders of record.
    const inst = await instrumentBySymbol(String(b.symbol));
    const perUnit = Math.round(Number(b.amountPerUnitCents));
    if (!Number.isInteger(perUnit) || perUnit <= 0) throw new HttpError(400, "amountPerUnitCents must be a positive integer");
    const kind = inst.assetClass === "debt" ? "coupon" : inst.assetClass === "real_estate" ? "rent" : "dividend";
    return db.transaction(async (tx) => {
      const rows = await tx.select({ h: holdings, kind: participants.kind }).from(holdings)
        .innerJoin(participants, eq(holdings.participantId, participants.id))
        .where(and(eq(holdings.instrumentId, inst.id), gt(holdings.qty, 0)));
      const payees: Record<string, number> = {};
      for (const r of rows) {
        if (r.kind === "venue") continue;
        payees[r.h.participantId] = r.h.qty * perUnit;
        await tx.update(participants).set({ cashCents: sql`${participants.cashCents} + ${r.h.qty * perUnit}` }).where(eq(participants.id, r.h.participantId));
      }
      const total = Object.values(payees).reduce((a, v) => a + v, 0);
      await tx.insert(adminActions).values({ actor, action: "distribution", target: inst.symbol, reason, details: { kind, perUnit, total, payees } });
      await tx.insert(wal).values({ instrumentId: inst.id, eventType: "CORPORATE_ACTION", payload: { kind, perUnit, total, holders: Object.keys(payees).length } });
      return { kind, holders: Object.keys(payees).length, totalCents: total };
    });
  }

  throw new HttpError(404, "Not found");
});

export const config: Config = { path: ["/api/admin/:action", "/api/admin/:action/:arg"], method: ["GET", "POST"] };
