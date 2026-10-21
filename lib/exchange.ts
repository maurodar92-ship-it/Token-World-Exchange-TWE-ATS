// Exchange orchestration: wires the pure matching / compliance / routing / surveillance cores
// to Postgres. Every order is processed inside one transaction holding a per-instrument
// advisory lock, which serialises matching per book (the single-writer principle of the
// LMAX sequencer) while different books match in parallel.

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  adminActions, catEvents, executions, holdings, instruments, orders, participants,
  settlements, surveillanceAlerts, venueRoutes, wal,
} from "../db/schema.js";
import { matchOrder, type RestingOrder, type Side } from "./matching.js";
import { preTradeCheck } from "./compliance.js";
import { routeOrder, simulateVenueFill, venueMode, venueQuotes, VENUES, type Liquidity } from "./venues.js";
import {
  detectFrontRunning, detectLayering, detectPriceSpike, detectSpoofing, detectWashTrade,
  type Alert, type OrderLite, type TradeLite,
} from "./surveillance.js";
import { encodeFix, fixTimestamp, FIX_ORD_STATUS, FIX_ORD_TYPE, FIX_SIDE, FIX_TIF, fixPx } from "./fix.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type OrderRow = typeof orders.$inferSelect;
type InstrumentRow = typeof instruments.$inferSelect;

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface SubmitInput {
  participantId: string;
  symbol: string;
  side: Side;
  type: "limit" | "market";
  tif?: "gtc" | "ioc" | "day";
  priceCents?: number | null;
  qty: number;
  routing?: "internal" | "sor";
  clOrdId?: string;
  source?: "web" | "fix" | "mm";
}

async function journal(tx: Tx, instrumentId: number | null, eventType: string, payload: Record<string, unknown>) {
  const [row] = await tx.insert(wal).values({ instrumentId, eventType, payload }).returning({ seq: wal.seq });
  return row.seq;
}

async function cat(tx: Tx, eventType: string, o: Pick<OrderRow, "id" | "participantId" | "instrumentId">, payload: Record<string, unknown>) {
  await tx.insert(catEvents).values({
    eventType, orderId: o.id, participantId: o.participantId, instrumentId: o.instrumentId,
    payload: { ...payload, eventTimestamp: new Date().toISOString(), imid: "TWEATS" },
  });
}

async function avgTradeQty(tx: Tx, instrumentId: number): Promise<number> {
  const [r] = await tx.select({ avg: sql<string>`coalesce(avg(${executions.qty}), 0)` })
    .from(executions).where(eq(executions.instrumentId, instrumentId));
  return Number(r.avg) || 10;
}

async function saveAlerts(tx: Tx, instrumentId: number, alerts: (Alert | null)[]) {
  const rows: Alert[] = [];
  for (const a of alerts) {
    if (!a) continue;
    // Pattern-style alerts are raised once per participant/book while an open case exists.
    if (a.type === "layering" || a.type === "front_running") {
      const open = await tx.select({ id: surveillanceAlerts.id }).from(surveillanceAlerts).where(and(
        eq(surveillanceAlerts.type, a.type), eq(surveillanceAlerts.participantId, a.participantId),
        eq(surveillanceAlerts.instrumentId, instrumentId), eq(surveillanceAlerts.status, "open"),
        gte(surveillanceAlerts.createdAt, new Date(Date.now() - 10 * 60_000)),
      )).limit(1);
      if (open.length) continue;
    }
    rows.push(a);
  }
  if (rows.length) await tx.insert(surveillanceAlerts).values(rows.map((a) => ({ ...a, instrumentId })));
}

const lite = (o: OrderRow): OrderLite => ({
  id: o.id, participantId: o.participantId, side: o.side as Side, priceCents: o.priceCents,
  qty: o.qty, leavesQty: o.leavesQty, status: o.status, createdAt: o.createdAt,
});

export function settlementPlan(inst: InstrumentRow, buyerWallet: string | null, sellerWallet: string | null, venue: string) {
  const now = Date.now();
  if (venue !== "TWE") {
    const v = VENUES.find((x) => x.id === venue);
    return { mode: "offchain_t0", rail: "ESCROW", dueAt: new Date(now + (v?.settlementMinutes ?? 60) * 60_000) };
  }
  if (inst.assetClass === "crypto") return { mode: "onchain_atomic", rail: "USDC", dueAt: new Date(now) };
  if (buyerWallet && sellerWallet && inst.chain !== "Off-chain ledger") {
    return { mode: "onchain_atomic", rail: inst.chain === "Provenance" ? "USDS" : "USDC", dueAt: new Date(now) };
  }
  if (inst.assetClass === "debt") return { mode: "offchain_t1", rail: "FEDWIRE", dueAt: new Date(now + 24 * 3600_000) };
  return { mode: "offchain_t0", rail: "ACH", dueAt: new Date(now + 2 * 60_000) };
}

/** Funds and tokens already committed by open orders and unsettled trades. */
async function commitments(tx: Tx, participantId: string, instrumentId: number) {
  const [open] = await tx.select({
    sellQty: sql<string>`coalesce(sum(case when ${orders.side} = 'sell' and ${orders.instrumentId} = ${instrumentId} then ${orders.leavesQty} else 0 end), 0)`,
    buyCents: sql<string>`coalesce(sum(case when ${orders.side} = 'buy' then ${orders.leavesQty}::bigint * coalesce(${orders.priceCents}, 0) else 0 end), 0)`,
  }).from(orders).where(and(eq(orders.participantId, participantId), inArray(orders.status, ["new", "partially_filled"])));
  const [unsettled] = await tx.select({
    sellQty: sql<string>`coalesce(sum(case when ${settlements.sellerId} = ${participantId} and ${settlements.instrumentId} = ${instrumentId} then ${settlements.qty} else 0 end), 0)`,
    buyCents: sql<string>`coalesce(sum(case when ${settlements.buyerId} = ${participantId} then ${settlements.amountCents} else 0 end), 0)`,
  }).from(settlements).where(inArray(settlements.status, ["matched", "locked"]));
  return {
    committedSellQty: Number(open.sellQty) + Number(unsettled.sellQty),
    committedBuyCents: Number(open.buyCents) + Number(unsettled.buyCents),
  };
}

function fixFor(o: OrderRow, symbol: string, seq: number) {
  return encodeFix({ msgType: "D", sender: o.participantId, target: "TWEATS", seqNum: seq, sendingTime: o.createdAt }, [
    [11, o.clOrdId], [55, symbol], [54, FIX_SIDE[o.side]], [60, fixTimestamp(o.createdAt)],
    [38, o.qty], [40, FIX_ORD_TYPE[o.type]], ...(o.priceCents !== null ? [[44, fixPx(o.priceCents)] as [number, string]] : []),
    [59, FIX_TIF[o.tif]],
  ], "|");
}

function execReport(o: OrderRow, symbol: string, seq: number, last?: { qty: number; priceCents: number; execId: string; venue: string }) {
  const execType = o.status === "rejected" ? "8" : o.status === "canceled" ? "4" : last ? "F" : "0";
  const avgPx = o.cumQty ? fixPx(Math.round(o.filledNotionalCents / o.cumQty)) : "0.00";
  return encodeFix({ msgType: "8", sender: "TWEATS", target: o.participantId, seqNum: seq }, [
    [37, `TWE-${o.id}`], [11, o.clOrdId], [17, last?.execId ?? `E-${o.id}-${seq}`], [150, execType],
    [39, FIX_ORD_STATUS[o.status]], [55, symbol], [54, FIX_SIDE[o.side]], [38, o.qty],
    ...(last ? [[32, last.qty], [31, fixPx(last.priceCents)], [30, last.venue]] as [number, string | number][] : []),
    [151, o.leavesQty], [14, o.cumQty], [6, avgPx],
    ...(o.rejectReason ? [[58, o.rejectReason.slice(0, 120)] as [number, string]] : []),
  ], "|");
}

export async function submitOrder(input: SubmitInput) {
  const qty = Number(input.qty);
  const priceCents = input.type === "market" ? null : input.priceCents == null ? null : Math.round(Number(input.priceCents));
  if (!["buy", "sell"].includes(input.side)) throw new HttpError(400, "side must be buy or sell");
  if (!["limit", "market"].includes(input.type)) throw new HttpError(400, "type must be limit or market");
  const tif = input.type === "market" ? "ioc" : input.tif ?? "gtc";
  if (!["gtc", "ioc", "day"].includes(tif)) throw new HttpError(400, "tif must be gtc, ioc or day");
  const routing = input.routing === "sor" ? "sor" : "internal";
  const clOrdId = (input.clOrdId || `C${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`).slice(0, 40);

  const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, input.symbol));
  if (!inst) throw new HttpError(404, `Unknown instrument ${input.symbol}`);
  const [part] = await db.select().from(participants).where(eq(participants.id, input.participantId));
  if (!part) throw new HttpError(404, `Unknown participant ${input.participantId}`);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${inst.id})`);
    const dup = await tx.select({ id: orders.id }).from(orders)
      .where(and(eq(orders.participantId, part.id), eq(orders.clOrdId, clOrdId)));
    if (dup.length) throw new HttpError(409, `Duplicate ClOrdID ${clOrdId}`);

    const [position] = await tx.select().from(holdings)
      .where(and(eq(holdings.participantId, part.id), eq(holdings.instrumentId, inst.id)));
    const committed = await commitments(tx, part.id, inst.id);
    const now = new Date();
    const reasons = preTradeCheck({
      participant: part, instrument: inst, side: input.side, type: input.type, qty, priceCents,
      position: position ?? null, ...committed, now,
    });

    const seq = await journal(tx, inst.id, reasons.length ? "ORDER_REJECTED" : "ORDER_ACCEPTED", {
      participantId: part.id, clOrdId, side: input.side, type: input.type, tif, priceCents, qty, routing, reasons,
    });
    const [order] = await tx.insert(orders).values({
      clOrdId, participantId: part.id, instrumentId: inst.id, side: input.side, type: input.type, tif, priceCents,
      qty: Number.isInteger(qty) && qty > 0 ? qty : 0, leavesQty: reasons.length ? 0 : qty, status: reasons.length ? "rejected" : "new",
      rejectReason: reasons.join("; ") || null, routing, source: input.source ?? "web", seq,
    }).returning();
    await cat(tx, "MENO", order, { side: order.side, price: priceCents, quantity: qty, orderType: order.type, timeInForce: tif, handlingInstructions: routing });

    const fixMessages: string[] = [fixFor(order, inst.symbol, seq)];
    if (reasons.length) {
      fixMessages.push(execReport(order, inst.symbol, seq));
      return { order, fills: [], routes: [], rejected: reasons, fix: fixMessages };
    }

    const oppositeSide = input.side === "buy" ? "sell" : "buy";
    const restingRows = await tx.select().from(orders).where(and(
      eq(orders.instrumentId, inst.id), eq(orders.side, oppositeSide), inArray(orders.status, ["new", "partially_filled"]),
    ));
    const resting: RestingOrder[] = restingRows.map((r) => ({
      id: r.id, participantId: r.participantId, side: r.side as Side, priceCents: r.priceCents!, leavesQty: r.leavesQty, seq: r.seq,
    }));

    // Smart order routing: rank internal levels against external venue quotes, then send the
    // internal slice to the matching engine and the external slices to venue adapters.
    let internalQty = qty;
    const routeResults: { venue: string; qty: number; priceCents: number; filled: boolean; mode: string }[] = [];
    if (routing === "sor") {
      const quotes = venueQuotes(inst.symbol, inst.assetClass, inst.refPriceCents, inst.tickCents);
      const internalLevels = new Map<number, number>();
      for (const r of resting) if (r.participantId !== part.id) internalLevels.set(r.priceCents, (internalLevels.get(r.priceCents) ?? 0) + r.leavesQty);
      const liquidity: Liquidity[] = [
        ...[...internalLevels].map(([p, q]) => ({ venue: "TWE", priceCents: p, qty: q, feeBps: 10, fillProbability: 1, settlementMinutes: 0 })),
        ...quotes.map((q) => {
          const v = VENUES.find((x) => x.id === q.venue)!;
          return {
            venue: q.venue, priceCents: input.side === "buy" ? q.askCents : q.bidCents, qty: input.side === "buy" ? q.askQty : q.bidQty,
            feeBps: v.feeBps, fillProbability: v.fillProbability, settlementMinutes: v.settlementMinutes,
          };
        }),
      ];
      const plan = routeOrder(input.side, qty, priceCents, liquidity);
      internalQty = plan.unallocated + plan.allocations.filter((a) => a.venue === "TWE").reduce((s, a) => s + a.allocQty, 0);
      for (const a of plan.allocations.filter((x) => x.venue !== "TWE")) {
        const v = VENUES.find((x) => x.id === a.venue)!;
        const filled = simulateVenueFill(a.venue, `${order.id}:${a.priceCents}`, a.fillProbability);
        const mode = venueMode(v, process.env);
        await tx.insert(venueRoutes).values({
          parentOrderId: order.id, venue: a.venue, side: input.side, qty: a.allocQty, priceCents: a.priceCents,
          feeBps: a.feeBps, score: a.score, mode, status: filled ? "filled" : "rejected",
        });
        await cat(tx, "MEOR", order, { destination: a.venue, routedQuantity: a.allocQty, price: a.priceCents, routeRejected: !filled });
        await journal(tx, inst.id, "ORDER_ROUTED", { orderId: order.id, venue: a.venue, qty: a.allocQty, priceCents: a.priceCents, filled, mode });
        routeResults.push({ venue: a.venue, qty: a.allocQty, priceCents: a.priceCents, filled, mode });
        if (!filled) internalQty += a.allocQty; // rejected child order returns to the parent
      }
    }

    const result = matchOrder({ participantId: part.id, side: input.side, type: input.type, priceCents, qty: internalQty }, resting);

    const fills: { venue: string; qty: number; priceCents: number; counterparty: string; executionId: number }[] = [];
    let cumQty = 0;
    let notional = 0;
    const restingById = new Map(restingRows.map((r) => [r.id, r]));

    const recordExecution = async (venue: string, counterparty: string, counterOrder: OrderRow | null, fillQty: number, px: number) => {
      const s = await journal(tx, inst.id, "TRADE", { aggressorOrderId: order.id, restingOrderId: counterOrder?.id ?? null, venue, qty: fillQty, priceCents: px });
      const buyerId = input.side === "buy" ? part.id : counterparty;
      const sellerId = input.side === "buy" ? counterparty : part.id;
      const [exec] = await tx.insert(executions).values({
        instrumentId: inst.id, buyerId, sellerId, priceCents: px, qty: fillQty, aggressorSide: input.side, venue, seq: s,
        buyOrderId: input.side === "buy" ? order.id : counterOrder?.id ?? null,
        sellOrderId: input.side === "sell" ? order.id : counterOrder?.id ?? null,
      }).returning();
      const [buyer] = await tx.select().from(participants).where(eq(participants.id, buyerId));
      const [seller] = await tx.select().from(participants).where(eq(participants.id, sellerId));
      const plan = settlementPlan(inst, buyer?.wallet ?? null, seller?.wallet ?? null, venue);
      const [stl] = await tx.insert(settlements).values({
        executionId: exec.id, instrumentId: inst.id, buyerId, sellerId, qty: fillQty, amountCents: px * fillQty, ...plan,
      }).returning();
      await cat(tx, "MEOT", order, { tradeId: exec.id, price: px, quantity: fillQty, buyerId, sellerId, venue });
      if (plan.mode === "onchain_atomic") await settle(tx, stl.id);
      fills.push({ venue, qty: fillQty, priceCents: px, counterparty, executionId: exec.id });
      cumQty += fillQty;
      notional += fillQty * px;
      return exec;
    };

    for (const f of result.fills) {
      const r = restingById.get(f.restingId)!;
      const leaves = r.leavesQty - f.qty;
      const [updated] = await tx.update(orders).set({
        leavesQty: leaves, cumQty: r.cumQty + f.qty, filledNotionalCents: r.filledNotionalCents + f.qty * f.priceCents,
        status: leaves === 0 ? "filled" : "partially_filled", updatedAt: new Date(),
      }).where(eq(orders.id, r.id)).returning();
      restingById.set(r.id, updated);
      await recordExecution("TWE", r.participantId, updated, f.qty, f.priceCents);
    }
    for (const rr of routeResults.filter((x) => x.filled)) {
      await recordExecution(rr.venue, `VENUE-${rr.venue}`, null, rr.qty, rr.priceCents);
    }

    let leavesQty = qty - cumQty;
    let status: string = cumQty === 0 ? "new" : leavesQty === 0 ? "filled" : "partially_filled";
    let rejectReason: string | null = null;
    if (leavesQty > 0 && (tif === "ioc" || result.selfTradePrevented)) {
      rejectReason = result.selfTradePrevented ? "Remainder cancelled: self-trade prevention" : "Remainder cancelled: IOC";
      leavesQty = 0;
      status = "canceled";
      await cat(tx, "MEOC", order, { cancelQuantity: qty - cumQty, reason: rejectReason });
    } else if (leavesQty > 0 && priceCents === null) {
      leavesQty = 0;
      status = "canceled";
      rejectReason = "Market order remainder cancelled: no liquidity";
    }
    const [final] = await tx.update(orders).set({
      leavesQty, cumQty, filledNotionalCents: notional, status, rejectReason, updatedAt: new Date(),
    }).where(eq(orders.id, order.id)).returning();

    if (fills.length) {
      await tx.update(instruments).set({ refPriceCents: fills[fills.length - 1].priceCents }).where(eq(instruments.id, inst.id));
    }

    // Post-trade / post-entry surveillance
    const avg = await avgTradeQty(tx, inst.id);
    const since = new Date(Date.now() - 10 * 60_000);
    const recentTrades = await tx.select().from(executions)
      .where(and(eq(executions.instrumentId, inst.id), gte(executions.createdAt, since)));
    const alerts: (Alert | null)[] = [];
    for (const f of fills) {
      const t = recentTrades.find((x) => x.id === f.executionId);
      if (!t) continue;
      alerts.push(detectWashTrade(t, recentTrades), detectPriceSpike(t, inst.refPriceCents));
    }
    if (final.leavesQty > 0) {
      const sameSide = await tx.select().from(orders).where(and(
        eq(orders.instrumentId, inst.id), eq(orders.participantId, part.id), eq(orders.side, input.side),
        inArray(orders.status, ["new", "partially_filled"]),
      ));
      alerts.push(detectLayering(part.id, sameSide.map(lite), avg));
    }
    const prior = await tx.select().from(orders).where(and(
      eq(orders.instrumentId, inst.id), gte(orders.createdAt, new Date(Date.now() - 15_000)),
    ));
    alerts.push(...detectFrontRunning(lite(final), prior.filter((o) => o.id !== final.id).map(lite), avg));
    await saveAlerts(tx, inst.id, alerts);

    const reportSeq = seq + 1;
    if (fills.length === 0) fixMessages.push(execReport(final, inst.symbol, reportSeq));
    fills.forEach((f, i) => fixMessages.push(execReport(
      { ...final, status: i === fills.length - 1 ? final.status : "partially_filled" }, inst.symbol, reportSeq + i,
      { qty: f.qty, priceCents: f.priceCents, execId: `X-${f.executionId}`, venue: f.venue },
    )));

    return { order: final, fills, routes: routeResults, rejected: [], fix: fixMessages, selfTradePrevented: result.selfTradePrevented };
  });
}

export async function cancelOrder(orderId: number, participantId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) throw new HttpError(404, "Order not found");
  if (o.participantId !== participantId) throw new HttpError(403, "Order belongs to another participant");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${o.instrumentId})`);
    const [cur] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!["new", "partially_filled"].includes(cur.status)) throw new HttpError(409, `Order is ${cur.status}`);
    const [updated] = await tx.update(orders).set({ status: "canceled", leavesQty: 0, updatedAt: new Date() })
      .where(eq(orders.id, orderId)).returning();
    await journal(tx, o.instrumentId, "ORDER_CANCELED", { orderId, participantId, canceledQty: cur.leavesQty });
    await cat(tx, "MEOC", updated, { cancelQuantity: cur.leavesQty, leavesQuantity: 0, initiator: "C" });

    const avg = await avgTradeQty(tx, o.instrumentId);
    const oppositeFills = await tx.select().from(executions).where(and(
      eq(executions.instrumentId, o.instrumentId), gte(executions.createdAt, cur.createdAt),
      eq(cur.side === "buy" ? executions.sellerId : executions.buyerId, participantId),
    ));
    await saveAlerts(tx, o.instrumentId, [detectSpoofing(lite(cur), avg, oppositeFills as TradeLite[], new Date())]);
    const [inst] = await tx.select().from(instruments).where(eq(instruments.id, o.instrumentId));
    return { order: updated, fix: [execReport(updated, inst.symbol, updated.seq + 1)] };
  });
}

/** DvP: lock both legs, verify, then move tokens and cash atomically — or fail with nothing moved. */
export async function settle(tx: Tx, settlementId: number) {
  const [s] = await tx.select().from(settlements).where(eq(settlements.id, settlementId));
  if (!s || !["matched", "locked"].includes(s.status)) return s;
  const [inst] = await tx.select().from(instruments).where(eq(instruments.id, s.instrumentId));
  const [buyer] = await tx.select().from(participants).where(eq(participants.id, s.buyerId));
  const [seller] = await tx.select().from(participants).where(eq(participants.id, s.sellerId));
  const [sellerPos] = await tx.select().from(holdings)
    .where(and(eq(holdings.participantId, s.sellerId), eq(holdings.instrumentId, s.instrumentId)));

  const fail = async (reason: string) => {
    const [f] = await tx.update(settlements).set({ status: "failed", failReason: reason }).where(eq(settlements.id, s.id)).returning();
    await journal(tx, s.instrumentId, "SETTLEMENT_FAILED", { settlementId: s.id, reason });
    return f;
  };
  const buyerIsVenue = buyer?.kind === "venue";
  const sellerIsVenue = seller?.kind === "venue";
  if (inst.status === "frozen") return fail("Instrument frozen by transfer agent");
  if (!sellerIsVenue && (!sellerPos || sellerPos.qty < s.qty)) return fail("Delivery leg: seller token balance insufficient");
  if (!sellerIsVenue && sellerPos?.frozen) return fail("Delivery leg: seller position frozen");
  if (!buyerIsVenue && buyer.cashCents < s.amountCents) return fail("Payment leg: buyer cash insufficient");

  if (!sellerIsVenue) {
    await tx.update(holdings).set({ qty: sql`${holdings.qty} - ${s.qty}`, updatedAt: new Date() })
      .where(and(eq(holdings.participantId, s.sellerId), eq(holdings.instrumentId, s.instrumentId)));
    await tx.update(participants).set({ cashCents: sql`${participants.cashCents} + ${s.amountCents}` }).where(eq(participants.id, s.sellerId));
  }
  if (!buyerIsVenue) {
    const restrictedUntil = inst.lockupDays > 0 ? new Date(Date.now() + inst.lockupDays * 86_400_000) : null;
    await tx.insert(holdings).values({
      participantId: s.buyerId, instrumentId: s.instrumentId, qty: s.qty,
      restrictedQty: restrictedUntil ? s.qty : 0, restrictedUntil,
    }).onConflictDoUpdate({
      target: [holdings.participantId, holdings.instrumentId],
      set: {
        qty: sql`${holdings.qty} + ${s.qty}`,
        restrictedQty: restrictedUntil ? sql`${holdings.restrictedQty} + ${s.qty}` : holdings.restrictedQty,
        restrictedUntil: restrictedUntil ?? holdings.restrictedUntil, updatedAt: new Date(),
      },
    });
    await tx.update(participants).set({ cashCents: sql`${participants.cashCents} - ${s.amountCents}` }).where(eq(participants.id, s.buyerId));
  }
  const txRef = s.mode === "onchain_atomic"
    ? `0x${[...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("")}`
    : `${s.rail}-${Date.now().toString(36).toUpperCase()}-${s.id}`;
  const [done] = await tx.update(settlements).set({ status: "settled", settledAt: new Date(), txRef }).where(eq(settlements.id, s.id)).returning();
  await journal(tx, s.instrumentId, "SETTLED", { settlementId: s.id, mode: s.mode, rail: s.rail, txRef });
  return done;
}

export async function runSettlementBatch(force = false) {
  const due = await db.select({ id: settlements.id }).from(settlements).where(and(
    inArray(settlements.status, ["matched", "locked"]),
    force ? sql`true` : sql`${settlements.dueAt} <= now()`,
  )).orderBy(settlements.id).limit(200);
  const results = [];
  for (const { id } of due) {
    results.push(await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${1_000_000 + id})`);
      return settle(tx, id);
    }));
  }
  return results;
}

export async function logAdmin(actor: string, action: string, target: string, reason: string, details?: Record<string, unknown>) {
  await db.insert(adminActions).values({ actor, action, target, reason, details });
  await db.insert(wal).values({ instrumentId: null, eventType: `ADMIN_${action.toUpperCase()}`, payload: { actor, target, reason, ...details } });
}

export async function recentOrders(participantId: string) {
  return db.select({ o: orders, symbol: instruments.symbol }).from(orders)
    .innerJoin(instruments, eq(orders.instrumentId, instruments.id))
    .where(eq(orders.participantId, participantId)).orderBy(desc(orders.id)).limit(60);
}
