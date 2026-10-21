// Real-time market surveillance detectors. Each detector is pure: the exchange layer feeds it
// a window of recent activity and persists whatever alerts come back.

export interface Alert {
  type: "wash_trade" | "spoofing" | "layering" | "price_spike" | "front_running";
  severity: "low" | "medium" | "high";
  participantId: string;
  details: Record<string, unknown>;
}

export interface TradeLite {
  id: number; buyerId: string; sellerId: string; priceCents: number; qty: number; createdAt: Date;
}

export interface OrderLite {
  id: number; participantId: string; side: "buy" | "sell"; priceCents: number | null; qty: number;
  leavesQty: number; status: string; createdAt: Date;
}

export const WASH_WINDOW_MS = 10 * 60_000;
export const SPOOF_LIFETIME_MS = 60_000;
export const SPOOF_SIZE_MULTIPLE = 5;
export const LAYERING_LEVELS = 4;
export const PRICE_SPIKE_PCT = 10;
export const FRONT_RUN_WINDOW_MS = 10_000;
export const BLOCK_SIZE_MULTIPLE = 10;

/** Round-trip trading between the same two accounts at near-identical price/size: no change in beneficial ownership. */
export function detectWashTrade(trade: TradeLite, recent: TradeLite[]): Alert | null {
  const match = recent.find((t) =>
    t.id !== trade.id &&
    t.buyerId === trade.sellerId && t.sellerId === trade.buyerId &&
    Math.abs(trade.createdAt.getTime() - t.createdAt.getTime()) <= WASH_WINDOW_MS &&
    Math.abs(t.qty - trade.qty) <= trade.qty * 0.1 &&
    Math.abs(t.priceCents - trade.priceCents) <= trade.priceCents * 0.01);
  if (!match) return null;
  return {
    type: "wash_trade", severity: "high", participantId: trade.buyerId,
    details: { counterparty: trade.sellerId, tradeIds: [match.id, trade.id], qty: trade.qty, priceCents: trade.priceCents },
  };
}

/** Large order cancelled quickly, especially if the same participant traded the other side while it rested. */
export function detectSpoofing(
  canceled: OrderLite, avgTradeQty: number, oppositeFillsDuringLife: TradeLite[], now: Date,
): Alert | null {
  const lifetime = now.getTime() - canceled.createdAt.getTime();
  const large = canceled.qty >= Math.max(1, avgTradeQty) * SPOOF_SIZE_MULTIPLE;
  if (!large || lifetime > SPOOF_LIFETIME_MS || canceled.leavesQty < canceled.qty * 0.9) return null;
  const benefited = oppositeFillsDuringLife.length > 0;
  return {
    type: "spoofing", severity: benefited ? "high" : "medium", participantId: canceled.participantId,
    details: {
      orderId: canceled.id, qty: canceled.qty, lifetimeMs: lifetime, avgTradeQty: Math.round(avgTradeQty),
      oppositeSideFills: oppositeFillsDuringLife.map((t) => t.id),
    },
  };
}

/** Many resting orders stacked at distinct price levels on one side, building false depth. */
export function detectLayering(participantId: string, openSameSide: OrderLite[], avgTradeQty: number): Alert | null {
  const levels = new Set(openSameSide.map((o) => o.priceCents));
  const total = openSameSide.reduce((a, o) => a + o.leavesQty, 0);
  if (levels.size < LAYERING_LEVELS || total < Math.max(1, avgTradeQty)) return null;
  return {
    type: "layering", severity: "medium", participantId,
    details: { side: openSameSide[0]?.side, levels: levels.size, totalQty: total, orderIds: openSameSide.map((o) => o.id) },
  };
}

export function detectPriceSpike(trade: TradeLite, refPriceCents: number): Alert | null {
  const movePct = ((trade.priceCents - refPriceCents) / refPriceCents) * 100;
  if (Math.abs(movePct) < PRICE_SPIKE_PCT) return null;
  return {
    type: "price_spike", severity: Math.abs(movePct) >= 15 ? "high" : "medium", participantId: trade.buyerId,
    details: { tradeId: trade.id, priceCents: trade.priceCents, refPriceCents, movePct: Number(movePct.toFixed(2)) },
  };
}

/** Another participant enters same-side orders just ahead of a block order. */
export function detectFrontRunning(block: OrderLite, priorOrders: OrderLite[], avgTradeQty: number): Alert[] {
  if (block.qty < Math.max(1, avgTradeQty) * BLOCK_SIZE_MULTIPLE) return [];
  const t = block.createdAt.getTime();
  return priorOrders
    .filter((o) => o.participantId !== block.participantId && o.side === block.side &&
      t - o.createdAt.getTime() >= 0 && t - o.createdAt.getTime() <= FRONT_RUN_WINDOW_MS)
    .map((o) => ({
      type: "front_running" as const, severity: "medium" as const, participantId: o.participantId,
      details: { blockOrderId: block.id, blockQty: block.qty, priorOrderId: o.id, leadMs: t - o.createdAt.getTime() },
    }));
}
