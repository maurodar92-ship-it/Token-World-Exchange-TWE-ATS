import { test } from "node:test";
import assert from "node:assert/strict";
import { matchOrder, aggregateLevels, type RestingOrder } from "./matching.ts";
import { preTradeCheck } from "./compliance.ts";
import { encodeFix, parseFix } from "./fix.ts";
import { routeOrder } from "./venues.ts";
import { detectWashTrade, detectSpoofing } from "./surveillance.ts";
import { fifoRealized } from "./tax.ts";

const asks: RestingOrder[] = [
  { id: 1, participantId: "A", side: "sell", priceCents: 101, leavesQty: 5, seq: 3 },
  { id: 2, participantId: "B", side: "sell", priceCents: 100, leavesQty: 5, seq: 2 },
  { id: 3, participantId: "C", side: "sell", priceCents: 100, leavesQty: 5, seq: 1 },
];

test("price-time priority: best price first, then earliest seq", () => {
  const r = matchOrder({ participantId: "X", side: "buy", type: "limit", priceCents: 101, qty: 12 }, asks);
  assert.deepEqual(r.fills.map((f) => [f.restingId, f.qty, f.priceCents]), [[3, 5, 100], [2, 5, 100], [1, 2, 101]]);
  assert.equal(r.leavesQty, 0);
});

test("limit price is respected", () => {
  const r = matchOrder({ participantId: "X", side: "buy", type: "limit", priceCents: 100, qty: 12 }, asks);
  assert.equal(r.fills.reduce((a, f) => a + f.qty, 0), 10);
  assert.equal(r.leavesQty, 2);
});

test("self-trade prevention cancels the incoming remainder", () => {
  const r = matchOrder({ participantId: "B", side: "buy", type: "market", priceCents: null, qty: 20 }, asks);
  assert.equal(r.fills.length, 1);
  assert.equal(r.selfTradePrevented, true);
  assert.equal(r.leavesQty, 0);
});

test("determinism: same input, same output regardless of input order", () => {
  const a = matchOrder({ participantId: "X", side: "buy", type: "limit", priceCents: 101, qty: 9 }, asks);
  const b = matchOrder({ participantId: "X", side: "buy", type: "limit", priceCents: 101, qty: 9 }, [...asks].reverse());
  assert.deepEqual(a, b);
});

test("L2 aggregation", () => {
  assert.deepEqual(aggregateLevels(asks, "sell"), [{ priceCents: 100, qty: 10, orders: 2 }, { priceCents: 101, qty: 5, orders: 1 }]);
});

const base = {
  participant: { id: "P", kind: "retail", country: "US", accredited: false, kycStatus: "approved", sanctionsClear: true, credentialId: "vc", cashCents: 1_000_000 },
  instrument: { symbol: "T", status: "active", regExemption: "reg_d_506c", permissioned: true, refPriceCents: 1000, tickCents: 5 },
  side: "buy" as const, type: "limit" as const, qty: 10, priceCents: 1000, position: null, committedSellQty: 0, committedBuyCents: 0, now: new Date(),
};

test("compliance: Reg D 506(c) needs accreditation, tick and collar enforced", () => {
  assert.match(preTradeCheck(base).join(), /accredited/);
  const r = preTradeCheck({ ...base, participant: { ...base.participant, accredited: true }, priceCents: 1301 });
  assert.match(r.join(), /tick/);
  assert.match(r.join(), /collar/);
});

test("compliance: Reg S excludes US persons; sanctions block", () => {
  const r = preTradeCheck({ ...base, instrument: { ...base.instrument, regExemption: "reg_s" }, participant: { ...base.participant, sanctionsClear: false } });
  assert.match(r.join(), /Reg S/);
  assert.match(r.join(), /Sanctions/);
});

test("compliance: Rule 144 restricted tokens cannot be sold", () => {
  const r = preTradeCheck({ ...base, side: "sell", participant: { ...base.participant, accredited: true },
    position: { qty: 10, restrictedQty: 8, restrictedUntil: new Date(Date.now() + 86_400_000), frozen: false } });
  assert.match(r.join(), /lock-up/);
});

test("FIX encode/parse roundtrip validates BodyLength and CheckSum", () => {
  const msg = encodeFix({ msgType: "D", sender: "INST-01", target: "TWEATS", seqNum: 7, sendingTime: new Date(0) },
    [[11, "ABC"], [55, "AURA"], [54, "1"], [38, 100], [40, "2"], [44, "42.50"]], "|");
  assert.equal(parseFix(msg).valid, true);
  assert.equal(parseFix(msg.replace("38=100", "38=900")).valid, false);
});

test("SOR ranks by all-in price and prefers the internal book on ties", () => {
  const plan = routeOrder("buy", 15, 105, [
    { venue: "TZRO", priceCents: 100, qty: 10, feeBps: 0, fillProbability: 1, settlementMinutes: 0 },
    { venue: "TWE", priceCents: 100, qty: 10, feeBps: 0, fillProbability: 1, settlementMinutes: 0 },
    { venue: "PPEX", priceCents: 110, qty: 50, feeBps: 0, fillProbability: 1, settlementMinutes: 0 },
  ]);
  assert.deepEqual(plan.allocations.map((a) => [a.venue, a.allocQty]), [["TWE", 10], ["TZRO", 5]]);
  assert.equal(plan.unallocated, 0);
});

test("surveillance: wash trade and spoofing", () => {
  const now = new Date();
  const t1 = { id: 1, buyerId: "A", sellerId: "B", priceCents: 100, qty: 10, createdAt: now };
  const t2 = { id: 2, buyerId: "B", sellerId: "A", priceCents: 100, qty: 10, createdAt: now };
  assert.equal(detectWashTrade(t2, [t1, t2])?.type, "wash_trade");
  const o = { id: 9, participantId: "A", side: "buy" as const, priceCents: 99, qty: 100, leavesQty: 100, status: "new", createdAt: new Date(now.getTime() - 5000) };
  assert.equal(detectSpoofing(o, 10, [t2], now)?.severity, "high");
});

test("FIFO tax lots", () => {
  const d = (n: number) => new Date(2026, 0, n);
  const { realized, open } = fifoRealized([
    { symbol: "X", side: "buy", qty: 10, priceCents: 100, at: d(1) },
    { symbol: "X", side: "buy", qty: 10, priceCents: 200, at: d(2) },
    { symbol: "X", side: "sell", qty: 15, priceCents: 300, at: d(3) },
  ]);
  assert.deepEqual(realized.map((r) => r.gainCents), [2000, 500]);
  assert.deepEqual(open.X, { qty: 5, costCents: 1000 });
});
