import { useState } from "react";
import { api, time } from "../api";
import { usePoll } from "../hooks";

interface Alert { id: number; type: string; severity: string; participantId: string | null; symbol: string | null; details: Record<string, unknown>; status: string; createdAt: string }
interface CatEvent { id: number; eventType: string; orderId: number | null; participantId: string | null; symbol: string | null; payload: Record<string, unknown>; status: string; createdAt: string }
interface WalEntry { seq: number; instrumentId: number | null; eventType: string; payload: Record<string, unknown>; createdAt: string }
interface Route { id: number; parentOrderId: number; venue: string; side: string; qty: number; priceCents: number; feeBps: number; score: number; mode: string; status: string; createdAt: string }

const ALERT_COPY: Record<string, string> = {
  wash_trade: "Round-trip between two accounts at matching price/size within 10 min",
  spoofing: "Large order (≥5× avg print) cancelled within 60s of entry",
  layering: "≥4 resting price levels stacked on one side",
  price_spike: "Print ≥10% away from reference price",
  front_running: "Same-side order entered ≤10s ahead of a block order",
};
const CAT_COPY: Record<string, string> = {
  MENO: "New Order", MEOR: "Order Route", MEOT: "Trade", MEOC: "Order Cancel", MEOA: "Order Accepted", MEOM: "Order Modify",
};

export function Compliance() {
  const [tab, setTab] = useState<"alerts" | "cat" | "wal" | "routes">("alerts");
  const alerts = usePoll<Alert[]>("/api/compliance/alerts", 5000);
  const cat = usePoll<CatEvent[]>(tab === "cat" ? "/api/compliance/cat" : null, 6000, [tab]);
  const wal = usePoll<WalEntry[]>(tab === "wal" ? "/api/compliance/wal" : null, 6000, [tab]);
  const routes = usePoll<Route[]>(tab === "routes" ? "/api/compliance/routes" : null, 6000, [tab]);

  const open = (alerts.data ?? []).filter((a) => a.status === "open");
  const byType = Object.keys(ALERT_COPY).map((t) => ({ t, n: open.filter((a) => a.type === t).length }));

  const disposition = async (id: number, status: string) => {
    const reason = prompt(`Disposition note for alert #${id} (${status})`) ?? "";
    if (!reason) return;
    await api(`/api/compliance/alerts/${id}`, { method: "PATCH", json: { status, reason, actor: "compliance-officer" } });
    alerts.refresh();
  };

  return (
    <>
      <div className="page-head rise">
        <div>
          <div className="kicker">Compliance & surveillance</div>
          <h1 className="h-display">Every order, <em>accounted for</em></h1>
          <p>Real-time surveillance runs on each order entry, trade and cancel. CAT industry-member events are staged for submission, and the append-only journal lets the book be replayed deterministically.</p>
        </div>
      </div>
      <div className="kpis rise" style={{ animationDelay: "60ms" }}>
        {byType.map(({ t, n }) => (
          <div key={t} className="kpi" title={ALERT_COPY[t]}>
            <div className="kicker">{t.replace("_", " ")}</div>
            <div className={`v num ${n ? "ask" : ""}`}>{n}</div>
            <div className="s">{ALERT_COPY[t]}</div>
          </div>
        ))}
      </div>
      <div className="panel rise" style={{ animationDelay: "120ms" }}>
        <div className="tabs">
          <button className={tab === "alerts" ? "on" : ""} onClick={() => setTab("alerts")}>Surveillance alerts<span className="count">{open.length || ""}</span></button>
          <button className={tab === "cat" ? "on" : ""} onClick={() => setTab("cat")}>CAT events</button>
          <button className={tab === "wal" ? "on" : ""} onClick={() => setTab("wal")}>Write-ahead journal</button>
          <button className={tab === "routes" ? "on" : ""} onClick={() => setTab("routes")}>SOR routing log</button>
        </div>
        <div className="scroll" style={{ maxHeight: "62vh" }}>
          {tab === "alerts" && (!alerts.data ? <Skel /> : alerts.data.length === 0 ?
            <div className="empty"><span className="serif">Quiet tape</span>No alerts. Try placing and quickly cancelling a large order, or stacking several bids at different prices.</div> :
            <table className="t">
              <thead><tr><th>#</th><th>Time</th><th>Type</th><th>Severity</th><th>Participant</th><th>Symbol</th><th>Evidence</th><th>Status</th><th /></tr></thead>
              <tbody>{alerts.data.map((a) => (
                <tr key={a.id}>
                  <td className="num muted">{a.id}</td><td className="num muted">{time(a.createdAt)}</td>
                  <td className="mono">{a.type.replace("_", " ")}</td>
                  <td><span className={`tag ${a.severity === "high" ? "ask" : a.severity === "medium" ? "amber" : ""}`}>{a.severity}</span></td>
                  <td className="mono">{a.participantId}</td><td className="mono">{a.symbol}</td>
                  <td className="mono muted" style={{ fontSize: 10.5, maxWidth: 360 }}>{JSON.stringify(a.details)}</td>
                  <td><span className={`tag ${a.status === "escalated" ? "ask" : a.status === "dismissed" ? "" : "amber"}`}>{a.status}</span></td>
                  <td className="r" style={{ whiteSpace: "nowrap" }}>{a.status === "open" && <>
                    <button className="btn sm" onClick={() => disposition(a.id, "dismissed")}>Dismiss</button>{" "}
                    <button className="btn sm danger" onClick={() => disposition(a.id, "escalated")}>Escalate</button></>}
                  </td>
                </tr>
              ))}</tbody>
            </table>)}
          {tab === "cat" && (!cat.data ? <Skel /> :
            <table className="t">
              <thead><tr><th>#</th><th>Time</th><th>Event</th><th>Order</th><th>Participant</th><th>Symbol</th><th>Payload</th><th>Status</th></tr></thead>
              <tbody>{cat.data.map((c) => (
                <tr key={c.id}>
                  <td className="num muted">{c.id}</td><td className="num muted">{time(c.createdAt)}</td>
                  <td><span className="tag info">{c.eventType}</span> <span className="muted">{CAT_COPY[c.eventType]}</span></td>
                  <td className="num">{c.orderId}</td><td className="mono">{c.participantId}</td><td className="mono">{c.symbol}</td>
                  <td className="mono muted" style={{ fontSize: 10.5, maxWidth: 380 }}>{JSON.stringify(c.payload)}</td>
                  <td><span className="tag">{c.status}</span></td>
                </tr>
              ))}</tbody>
            </table>)}
          {tab === "wal" && (!wal.data ? <Skel /> :
            <table className="t">
              <thead><tr><th>Seq</th><th>Time</th><th>Event</th><th>Book</th><th>Payload</th></tr></thead>
              <tbody>{wal.data.map((w) => (
                <tr key={w.seq}>
                  <td className="num amber">{w.seq}</td><td className="num muted">{time(w.createdAt)}</td>
                  <td className="mono">{w.eventType}</td><td className="num muted">{w.instrumentId ?? "—"}</td>
                  <td className="mono muted" style={{ fontSize: 10.5 }}>{JSON.stringify(w.payload)}</td>
                </tr>
              ))}</tbody>
            </table>)}
          {tab === "routes" && (!routes.data ? <Skel /> : routes.data.length === 0 ?
            <div className="empty"><span className="serif">No routed flow</span>Choose "Smart router" on the order ticket to route child orders to away venues.</div> :
            <table className="t">
              <thead><tr><th>#</th><th>Time</th><th>Parent</th><th>Venue</th><th>Side</th><th className="r">Qty</th><th className="r">Px</th><th className="r">Fee</th><th className="r">Best-ex score</th><th>Mode</th><th>Result</th></tr></thead>
              <tbody>{routes.data.map((r) => (
                <tr key={r.id}>
                  <td className="num muted">{r.id}</td><td className="num muted">{time(r.createdAt)}</td><td className="num">{r.parentOrderId}</td>
                  <td className="mono">{r.venue}</td><td className={r.side === "buy" ? "bid" : "ask"}>{r.side}</td>
                  <td className="r num">{r.qty}</td><td className="r num">{(r.priceCents / 100).toFixed(2)}</td><td className="r num muted">{r.feeBps}bp</td>
                  <td className="r num">{(r.score / 10000).toFixed(4)}</td><td><span className="tag amber">{r.mode}</span></td>
                  <td><span className={`tag ${r.status === "filled" ? "bid" : "ask"}`}>{r.status}</span></td>
                </tr>
              ))}</tbody>
            </table>)}
        </div>
      </div>
    </>
  );
}

const Skel = () => <div className="panel-b" style={{ display: "grid", gap: 6 }}>{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 16 }} />)}</div>;
