// FIFO tax-lot engine used for 1099-B style realized gain reporting.

export interface TaxTrade { symbol: string; side: "buy" | "sell"; qty: number; priceCents: number; at: Date }
export interface RealizedLot {
  symbol: string; qty: number; acquired: Date; sold: Date; costCents: number; proceedsCents: number; gainCents: number; term: "short" | "long";
}

export function fifoRealized(trades: TaxTrade[]): { realized: RealizedLot[]; open: Record<string, { qty: number; costCents: number }> } {
  const lots = new Map<string, { qty: number; priceCents: number; at: Date }[]>();
  const realized: RealizedLot[] = [];
  for (const t of [...trades].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const q = lots.get(t.symbol) ?? [];
    lots.set(t.symbol, q);
    if (t.side === "buy") { q.push({ qty: t.qty, priceCents: t.priceCents, at: t.at }); continue; }
    let remaining = t.qty;
    while (remaining > 0 && q.length) {
      const lot = q[0];
      const take = Math.min(lot.qty, remaining);
      const cost = take * lot.priceCents;
      const proceeds = take * t.priceCents;
      const longTerm = t.at.getTime() - lot.at.getTime() > 365 * 86_400_000;
      realized.push({ symbol: t.symbol, qty: take, acquired: lot.at, sold: t.at, costCents: cost, proceedsCents: proceeds, gainCents: proceeds - cost, term: longTerm ? "long" : "short" });
      lot.qty -= take;
      remaining -= take;
      if (lot.qty === 0) q.shift();
    }
    // Sales of positions acquired before the reporting window (seeded / transferred-in) have unknown basis.
    if (remaining > 0) {
      realized.push({ symbol: t.symbol, qty: remaining, acquired: new Date(0), sold: t.at, costCents: 0, proceedsCents: remaining * t.priceCents, gainCents: remaining * t.priceCents, term: "short" });
    }
  }
  const open: Record<string, { qty: number; costCents: number }> = {};
  for (const [sym, q] of lots) {
    const qty = q.reduce((a, l) => a + l.qty, 0);
    if (qty) open[sym] = { qty, costCents: q.reduce((a, l) => a + l.qty * l.priceCents, 0) };
  }
  return { realized, open };
}
