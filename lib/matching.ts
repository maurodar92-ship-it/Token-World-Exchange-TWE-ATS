// Deterministic price-time priority (FIFO) matching core.
// Pure function: given the same incoming order and resting book it always produces the same
// fills, which is what lets the WAL be replayed to rebuild the book bit-for-bit.

export type Side = "buy" | "sell";

export interface RestingOrder {
  id: number;
  participantId: string;
  side: Side;
  priceCents: number;
  leavesQty: number;
  seq: number;
}

export interface IncomingOrder {
  participantId: string;
  side: Side;
  type: "limit" | "market";
  priceCents: number | null;
  qty: number;
}

export interface Fill {
  restingId: number;
  restingParticipantId: string;
  priceCents: number;
  qty: number;
}

export interface MatchResult {
  fills: Fill[];
  leavesQty: number;
  // Self-trade prevention (cancel-newest): the incoming remainder is cancelled rather than
  // trading against the same beneficial owner.
  selfTradePrevented: boolean;
}

export function priorityCompare(a: RestingOrder, b: RestingOrder): number {
  if (a.priceCents !== b.priceCents) {
    return a.side === "sell" ? a.priceCents - b.priceCents : b.priceCents - a.priceCents;
  }
  return a.seq - b.seq;
}

export function crosses(incoming: IncomingOrder, resting: RestingOrder): boolean {
  if (incoming.type === "market" || incoming.priceCents === null) return true;
  return incoming.side === "buy"
    ? incoming.priceCents >= resting.priceCents
    : incoming.priceCents <= resting.priceCents;
}

export function matchOrder(incoming: IncomingOrder, opposite: RestingOrder[]): MatchResult {
  const book = opposite.filter((o) => o.leavesQty > 0 && o.side !== incoming.side).sort(priorityCompare);
  const fills: Fill[] = [];
  let leaves = incoming.qty;
  let selfTradePrevented = false;

  for (const resting of book) {
    if (leaves === 0) break;
    if (!crosses(incoming, resting)) break;
    if (resting.participantId === incoming.participantId) {
      selfTradePrevented = true;
      break;
    }
    const qty = Math.min(leaves, resting.leavesQty);
    fills.push({ restingId: resting.id, restingParticipantId: resting.participantId, priceCents: resting.priceCents, qty });
    leaves -= qty;
  }

  return { fills, leavesQty: selfTradePrevented ? 0 : leaves, selfTradePrevented };
}

export interface Level { priceCents: number; qty: number; orders: number }

export function aggregateLevels(orders: RestingOrder[], side: Side, depth = 12): Level[] {
  const map = new Map<number, Level>();
  for (const o of orders) {
    if (o.side !== side || o.leavesQty <= 0) continue;
    const lvl = map.get(o.priceCents) ?? { priceCents: o.priceCents, qty: 0, orders: 0 };
    lvl.qty += o.leavesQty;
    lvl.orders += 1;
    map.set(o.priceCents, lvl);
  }
  return [...map.values()]
    .sort((a, b) => (side === "buy" ? b.priceCents - a.priceCents : a.priceCents - b.priceCents))
    .slice(0, depth);
}
