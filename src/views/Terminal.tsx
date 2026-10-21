import { useEffect, useMemo, useState } from "react";
import { api, money, REG_LABEL, time, usd, type Book, type Candle, type Instrument, type Order, type Tape } from "../api";
import { usePoll } from "../hooks";
import { Chart } from "../components/Chart";
import { FixLine } from "../components/FixLine";
import { buildNewOrderSingle } from "../fix-client";

interface SubmitResult {
  order: Order; fills: { venue: string; qty: number; priceCents: number; counterparty: string }[];
  routes: { venue: string; qty: number; priceCents: number; filled: boolean; mode: string }[];
  rejected: string[]; fix: string[]; error?: string; errors?: string[];
}
interface VenueQuote { venue: string; name: string; bidCents: number; bidQty: number; askCents: number; askQty: number; feeBps: number; fillProbability: number; settlementMinutes: number }

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

export function Terminal({ instruments, symbol, setSymbol, acting }: {
  instruments: Instrument[]; symbol: string; setSymbol: (s: string) => void; acting: string;
}) {
  const inst = instruments.find((i) => i.symbol === symbol);
  const book = usePoll<Book>(`/api/book/${encodeURIComponent(symbol)}`, 2000);
  const trades = usePoll<{ tape: Tape[]; candles: Candle[] }>(`/api/trades/${encodeURIComponent(symbol)}`, 4000);
  const myOrders = usePoll<Order[]>("/api/orders", 4000, [acting]);
  const venues = usePoll<{ quotes: VenueQuote[] }>(`/api/venues?symbol=${encodeURIComponent(symbol)}`, 15000);
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [tab, setTab] = useState<"orders" | "tape" | "fix" | "fixentry">("orders");
  const [px, setPx] = useState<string>("");

  const onResult = (r: SubmitResult) => {
    setFixLog((l) => [...r.fix.slice().reverse(), ...l].slice(0, 60));
    book.refresh(); trades.refresh(); myOrders.refresh();
  };

  const cancel = async (id: number) => {
    const r = await api<{ fix: string[] }>(`/api/orders/${id}`, { method: "DELETE" }).catch((e) => ({ fix: [], error: e.message }));
    setFixLog((l) => [...r.fix, ...l]);
    myOrders.refresh(); book.refresh();
  };

  if (!inst) return <div className="empty"><span className="serif">Loading markets…</span></div>;
  const chg = pct(inst.refPriceCents, inst.open24hCents);
  const openOrders = (myOrders.data ?? []).filter((o) => o.status === "new" || o.status === "partially_filled");

  return (
    <div className="terminal">
      <aside className="panel watch rise">
        <div className="panel-h"><span className="t">Markets</span><span className="r">{instruments.length}</span></div>
        {instruments.map((i) => {
          const c = pct(i.refPriceCents, i.open24hCents);
          return (
            <div key={i.symbol} className={`watch-row ${i.symbol === symbol ? "on" : ""}`} onClick={() => setSymbol(i.symbol)}>
              <span className="sym">{i.symbol}</span>
              <span className="num">{usd(i.refPriceCents)}</span>
              <span className="sub">{i.issuancePlatform} · {REG_LABEL[i.regExemption]}</span>
              <span className={`num ${c >= 0 ? "bid" : "ask"}`} style={{ fontSize: 11, textAlign: "right" }}>
                {i.status !== "active" ? <span className="tag ask">{i.status}</span> : `${c >= 0 ? "+" : ""}${c.toFixed(2)}%`}
              </span>
            </div>
          );
        })}
      </aside>

      <section className="center-stack">
        <div className="panel rise" style={{ animationDelay: "60ms" }}>
          <div className="inst-head">
            <div>
              <div className="kicker">{inst.symbol} · {inst.assetClass.replace("_", " ")}</div>
              <h2 className="serif" style={{ fontSize: 22, margin: "4px 0 8px" }}>{inst.name}</h2>
              <div className="meta">
                <span className="tag amber">{inst.tokenStandard}</span>
                <span className="tag">{inst.issuancePlatform}</span>
                <span className="tag">{inst.chain}</span>
                <span className="tag info">{REG_LABEL[inst.regExemption]}</span>
                {inst.permissioned && <span className="tag">VC-gated</span>}
                {inst.status !== "active" && <span className="tag ask">{inst.status}</span>}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 24, alignItems: "flex-end" }}>
              <div className="stat"><span>24h chg</span><b className={chg >= 0 ? "bid" : "ask"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</b></div>
              <div className="stat"><span>24h vol</span><b>{inst.volume24h.toLocaleString()}</b></div>
              <div className="stat"><span>Prints</span><b>{inst.trades24h}</b></div>
              <div className="px num">{usd(inst.refPriceCents)}</div>
            </div>
          </div>
          <Chart candles={trades.data?.candles ?? []} refPriceCents={inst.refPriceCents} />
        </div>

        <div className="panel rise" style={{ animationDelay: "120ms" }}>
          <div className="tabs">
            <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>My orders<span className="count">{openOrders.length || ""}</span></button>
            <button className={tab === "tape" ? "on" : ""} onClick={() => setTab("tape")}>Time & sales</button>
            <button className={tab === "fix" ? "on" : ""} onClick={() => setTab("fix")}>FIX session log<span className="count">{fixLog.length || ""}</span></button>
            <button className={tab === "fixentry" ? "on" : ""} onClick={() => setTab("fixentry")}>Raw FIX entry</button>
          </div>
          {tab === "orders" && <OrdersTable orders={myOrders.data} onCancel={cancel} />}
          {tab === "tape" && <TapeTable tape={trades.data?.tape} />}
          {tab === "fix" && (
            <div className="fixlog">
              {fixLog.length ? fixLog.map((m, i) => <FixLine key={fixLog.length - i} msg={m} />)
                : <div className="empty"><span className="serif">Session idle</span>Submit an order to see 35=D / 35=8 traffic.</div>}
            </div>
          )}
          {tab === "fixentry" && <FixEntry acting={acting} inst={inst} onResult={onResult} />}
        </div>
      </section>

      <aside className="right-stack">
        <Ladder book={book.data} onPick={(p) => setPx(usd(p).replace(/,/g, ""))} />
        <Ticket inst={inst} acting={acting} px={px} setPx={setPx} onResult={onResult} />
        <VenuePanel quotes={venues.data?.quotes} />
      </aside>
    </div>
  );
}

function Ladder({ book, onPick }: { book: Book | null; onPick: (p: number) => void }) {
  if (!book) return <div className="panel"><div className="panel-h"><span className="t">Depth of market</span></div>
    <div className="panel-b" style={{ display: "grid", gap: 6 }}>{Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton" style={{ height: 14 }} />)}</div></div>;
  const max = Math.max(1, ...book.bids.map((b) => b.qty), ...book.asks.map((a) => a.qty));
  const bestBid = book.bids[0]?.priceCents, bestAsk = book.asks[0]?.priceCents;
  const asks = book.asks.slice(0, 8).reverse();
  return (
    <div className="panel ladder rise" style={{ animationDelay: "80ms" }}>
      <div className="panel-h"><span className="t">Depth of market · L2</span><span className="r">click to price</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 44px", padding: "5px 12px", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: ".1em" }}>
        <span>PRICE</span><span style={{ textAlign: "right" }}>SIZE</span><span style={{ textAlign: "right" }}>#</span>
      </div>
      {asks.length === 0 && <div className="muted" style={{ padding: "6px 12px" }}>No offers</div>}
      {asks.map((l) => (
        <div key={`a${l.priceCents}`} className="ladder-row ask" onClick={() => onPick(l.priceCents)}>
          <div className="bar" style={{ width: `${(l.qty / max) * 100}%` }} />
          <span className="ask">{usd(l.priceCents)}</span><span className="q">{l.qty.toLocaleString()}</span><span className="n">{l.orders}</span>
        </div>
      ))}
      <div className="spread">
        <span className="muted">SPREAD</span>
        <span>{bestBid && bestAsk ? `${usd(bestAsk - bestBid)} · ${(((bestAsk - bestBid) / bestAsk) * 10000).toFixed(1)} bps` : "—"}</span>
      </div>
      {book.bids.slice(0, 8).map((l) => (
        <div key={`b${l.priceCents}`} className="ladder-row bid" onClick={() => onPick(l.priceCents)}>
          <div className="bar" style={{ width: `${(l.qty / max) * 100}%` }} />
          <span className="bid">{usd(l.priceCents)}</span><span className="q">{l.qty.toLocaleString()}</span><span className="n">{l.orders}</span>
        </div>
      ))}
      {book.bids.length === 0 && <div className="muted" style={{ padding: "6px 12px" }}>No bids</div>}
    </div>
  );
}

function Ticket({ inst, acting, px, setPx, onResult }: {
  inst: Instrument; acting: string; px: string; setPx: (s: string) => void; onResult: (r: SubmitResult) => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [tif, setTif] = useState<"gtc" | "ioc" | "day">("gtc");
  const [routing, setRouting] = useState<"internal" | "sor">("internal");
  const [qty, setQty] = useState("10");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => { setPx(usd(inst.refPriceCents).replace(/,/g, "")); setResult(null); }, [inst.symbol]);

  const priceCents = Math.round(Number(px) * 100);
  const notional = (type === "market" ? inst.refPriceCents : priceCents) * (Number(qty) || 0);

  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await api<SubmitResult>("/api/orders", { method: "POST", json: {
        symbol: inst.symbol, side, type, tif: type === "market" ? "ioc" : tif, qty: Number(qty), priceCents: type === "limit" ? priceCents : null, routing,
      } });
      setResult(r); onResult(r);
    } catch (e) {
      setResult({ rejected: [(e as Error).message], fills: [], routes: [], fix: [] } as unknown as SubmitResult);
    } finally { setBusy(false); }
  };

  return (
    <div className="panel rise" style={{ animationDelay: "140ms" }}>
      <div className="panel-h"><span className="t">Order entry</span><span className="r mono">{acting}</span></div>
      <div className="panel-b ticket">
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr", display: "grid" }}>
          <button className={side === "buy" ? "on buy" : ""} onClick={() => setSide("buy")}>Buy</button>
          <button className={side === "sell" ? "on sell" : ""} onClick={() => setSide("sell")}>Sell</button>
        </div>
        <div className="ticket-grid">
          <label className="field"><span>Type</span>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as "limit")}><option value="limit">Limit</option><option value="market">Market</option></select>
          </label>
          <label className="field"><span>TIF</span>
            <select className="select" value={type === "market" ? "ioc" : tif} disabled={type === "market"} onChange={(e) => setTif(e.target.value as "gtc")}>
              <option value="gtc">GTC</option><option value="day">Day</option><option value="ioc">IOC</option>
            </select>
          </label>
          <label className="field"><span>Limit price</span>
            <input className="input" inputMode="decimal" value={type === "market" ? "MKT" : px} disabled={type === "market"} onChange={(e) => setPx(e.target.value)} />
          </label>
          <label className="field"><span>Quantity</span>
            <input className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} />
          </label>
        </div>
        <label className="field"><span>Routing</span>
          <div className="seg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <button className={routing === "internal" ? "on" : ""} onClick={() => setRouting("internal")}>TWE book</button>
            <button className={routing === "sor" ? "on" : ""} onClick={() => setRouting("sor")}>Smart router</button>
          </div>
        </label>
        <div style={{ display: "flex", justifyContent: "space-between" }} className="mono">
          <span className="muted">Est. notional</span><b>{money(notional || 0)}</b>
        </div>
        <button className={`btn ${side}`} style={{ padding: "11px" }} disabled={busy || !Number(qty)} onClick={submit}>
          {busy ? "Matching…" : `${side} ${qty || 0} ${inst.symbol}`}
        </button>
        {result && <OrderResult r={result} />}
      </div>
    </div>
  );
}

function OrderResult({ r }: { r: SubmitResult }) {
  if (r.rejected?.length) return (
    <div className="result bad"><b className="ask mono">REJECTED · pre-trade compliance</b><ul>{r.rejected.map((x) => <li key={x}>{x}</li>)}</ul></div>
  );
  const filled = r.fills.reduce((a, f) => a + f.qty, 0);
  return (
    <div className="result good">
      <b className="bid mono">{r.order.status.replace("_", " ").toUpperCase()} · {filled}/{r.order.qty} filled</b>
      {r.fills.map((f, i) => <div key={i} className="mono" style={{ fontSize: 11 }}>{f.qty} @ {usd(f.priceCents)} <span className="muted">via {f.venue}</span></div>)}
      {r.routes.filter((x) => !x.filled).map((x, i) => <div key={`r${i}`} className="mono muted" style={{ fontSize: 11 }}>{x.venue} child {x.qty} rejected → returned to TWE book</div>)}
      {r.order.rejectReason && <div className="mono muted" style={{ fontSize: 11 }}>{r.order.rejectReason}</div>}
    </div>
  );
}

function VenuePanel({ quotes }: { quotes?: VenueQuote[] }) {
  const best = useMemo(() => {
    if (!quotes?.length) return null;
    return { bid: Math.max(...quotes.map((q) => q.bidCents)), ask: Math.min(...quotes.map((q) => q.askCents)) };
  }, [quotes]);
  return (
    <div className="panel rise" style={{ animationDelay: "200ms" }}>
      <div className="panel-h"><span className="t">Away venues · SOR</span><span className="r"><span className="tag amber">simulated</span></span></div>
      {!quotes ? <div className="panel-b"><div className="skeleton" style={{ height: 80 }} /></div> :
        quotes.length === 0 ? <div className="empty">No connected venue lists this asset class.</div> :
        <table className="t">
          <thead><tr><th>Venue</th><th className="r">Bid</th><th className="r">Ask</th><th className="r">Fee</th></tr></thead>
          <tbody>{quotes.map((q) => (
            <tr key={q.venue} title={`${q.name} · fill-rate ${(q.fillProbability * 100).toFixed(0)}% · settles ~${q.settlementMinutes}m`}>
              <td className="mono">{q.venue}</td>
              <td className={`r num ${q.bidCents === best?.bid ? "bid" : "dim"}`}>{usd(q.bidCents)}<div className="muted" style={{ fontSize: 10 }}>{q.bidQty}</div></td>
              <td className={`r num ${q.askCents === best?.ask ? "ask" : "dim"}`}>{usd(q.askCents)}<div className="muted" style={{ fontSize: 10 }}>{q.askQty}</div></td>
              <td className="r num muted">{q.feeBps}bp</td>
            </tr>
          ))}</tbody>
        </table>}
    </div>
  );
}

function OrdersTable({ orders, onCancel }: { orders: Order[] | null; onCancel: (id: number) => void }) {
  if (!orders) return <div className="panel-b"><div className="skeleton" style={{ height: 60 }} /></div>;
  if (!orders.length) return <div className="empty"><span className="serif">No orders yet</span>Use the ticket on the right — or click a ladder level to price.</div>;
  return (
    <div className="scroll" style={{ maxHeight: 280 }}>
      <table className="t">
        <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th className="r">Px</th><th className="r">Filled / Qty</th><th>Status</th><th>Route</th><th /></tr></thead>
        <tbody>{orders.map((o) => (
          <tr key={o.id}>
            <td className="num muted">{time(o.createdAt)}</td>
            <td className="mono">{o.symbol}</td>
            <td className={o.side === "buy" ? "bid" : "ask"}>{o.side.toUpperCase()}</td>
            <td className="r num">{o.priceCents === null ? "MKT" : usd(o.priceCents)}</td>
            <td className="r num">{o.cumQty}/{o.qty}</td>
            <td>
              <span className={`tag ${o.status === "rejected" ? "ask" : o.status === "filled" ? "bid" : o.status === "canceled" ? "" : "amber"}`}>{o.status.replace("_", " ")}</span>
              {o.rejectReason && <div className="muted" style={{ fontSize: 10.5, marginTop: 3, maxWidth: 340 }}>{o.rejectReason}</div>}
            </td>
            <td className="mono muted">{o.routing}{o.source === "fix" ? " · FIX" : ""}</td>
            <td className="r">{(o.status === "new" || o.status === "partially_filled") && <button className="btn sm danger" onClick={() => onCancel(o.id)}>Cancel</button>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function TapeTable({ tape }: { tape?: Tape[] }) {
  if (!tape) return <div className="panel-b"><div className="skeleton" style={{ height: 60 }} /></div>;
  return (
    <div className="scroll" style={{ maxHeight: 280 }}>
      <table className="t">
        <thead><tr><th>Time</th><th className="r">Price</th><th className="r">Size</th><th>Aggressor</th><th>Venue</th></tr></thead>
        <tbody>{tape.map((t) => (
          <tr key={t.id}>
            <td className="num muted">{time(t.createdAt)}</td>
            <td className={`r num ${t.aggressorSide === "buy" ? "bid" : "ask"}`}>{usd(t.priceCents)}</td>
            <td className="r num">{t.qty.toLocaleString()}</td>
            <td className="muted">{t.aggressorSide}</td>
            <td className="mono">{t.venue}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function FixEntry({ acting, inst, onResult }: { acting: string; inst: Instrument; onResult: (r: SubmitResult) => void }) {
  const make = () => buildNewOrderSingle({
    sender: acting, seq: Math.floor(Date.now() / 1000) % 100000, clOrdId: `FIX${Date.now().toString(36).toUpperCase()}`,
    symbol: inst.symbol, side: "buy", qty: 5, price: (inst.refPriceCents / 100).toFixed(2), type: "limit",
  });
  const [raw, setRaw] = useState(make);
  const [out, setOut] = useState<{ accepted?: boolean; errors?: string[]; fix?: string[]; rejected?: string[] } | null>(null);
  useEffect(() => { setRaw(make()); setOut(null); }, [inst.symbol, acting]);

  const send = async () => {
    const res = await fetch("/api/fix", { method: "POST", body: raw });
    const data = await res.json();
    setOut(data);
    if (data.fix) onResult({ fix: data.fix, fills: [], routes: [], rejected: [], order: data.order } as SubmitResult);
  };

  return (
    <div className="panel-b" style={{ display: "grid", gap: 10 }}>
      <div className="muted" style={{ lineHeight: 1.5 }}>
        Paste or edit a pipe-delimited FIX 4.4 <span className="mono amber">NewOrderSingle (35=D)</span>. BodyLength (9) and CheckSum (10) are validated —
        edit any field without recomputing and the gateway answers with a session-level Reject (35=3). Add <span className="mono">100=SOR</span> to route via the smart order router.
      </div>
      <textarea className="textarea" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />
      <div className="form-row">
        <button className="btn primary" onClick={send}>Send over FIX gateway</button>
        <button className="btn ghost" onClick={() => setRaw(make())}>Regenerate with valid checksum</button>
      </div>
      {out && (
        <div className={`result ${out.accepted ? "good" : "bad"}`}>
          <b className={`mono ${out.accepted ? "bid" : "ask"}`}>{out.accepted ? "ACCEPTED" : "REJECTED"}</b>
          {[...(out.errors ?? []), ...(out.rejected ?? [])].map((e) => <div key={e}>{e}</div>)}
          <div className="fixlog" style={{ padding: 0 }}>{out.fix?.map((m, i) => <FixLine key={i} msg={m} />)}</div>
        </div>
      )}
    </div>
  );
}
