import { useState } from "react";
import { api, money, time } from "../api";
import { usePoll } from "../hooks";

interface Stl { id: number; executionId: number; symbol: string; buyerId: string; sellerId: string; qty: number; amountCents: number; mode: string; rail: string; status: string; failReason: string | null; txRef: string | null; dueAt: string; settledAt: string | null; createdAt: string }

const MODES: Record<string, { label: string; copy: string }> = {
  onchain_atomic: { label: "On-chain atomic", copy: "Both legs locked in a hashlock escrow and swapped in a single transaction (USDC / USDS)." },
  offchain_t0: { label: "Off-chain T+0", copy: "Matched on TWE, cleared in the next transfer-agent batch the same day (ACH / escrow)." },
  offchain_t1: { label: "Off-chain T+1", copy: "Debt instruments: payment over Fedwire, book-entry update next business day." },
};

export function Settlement() {
  const s = usePoll<Stl[]>("/api/settlements", 5000);
  const [msg, setMsg] = useState<string | null>(null);
  const rows = s.data ?? [];
  const count = (st: string) => rows.filter((r) => r.status === st).length;

  const run = async () => {
    const r = await api<{ processed: number; settled: number; failed: number }>("/api/settlements", { method: "POST" });
    setMsg(`Batch processed ${r.processed}: ${r.settled} settled, ${r.failed} failed`);
    s.refresh();
  };

  return (
    <>
      <div className="page-head rise">
        <div>
          <div className="kicker">DvP clearing & escrow router</div>
          <h1 className="h-display">Delivery <em>versus</em> payment</h1>
          <p>Each execution spawns a settlement instruction. Tokens and cash move together or not at all — a failed leg fails the whole instruction and nothing is transferred.</p>
        </div>
        <div style={{ marginLeft: "auto", display: "grid", gap: 6, justifyItems: "end" }}>
          <button className="btn primary" onClick={run}>Run clearing batch now</button>
          <span className="muted mono" style={{ fontSize: 10.5 }}>Scheduled batch runs every minute</span>
          {msg && <span className="mono amber" style={{ fontSize: 11 }}>{msg}</span>}
        </div>
      </div>
      <div className="kpis rise" style={{ animationDelay: "60ms" }}>
        <div className="kpi"><div className="kicker">Pending</div><div className="v num amber">{count("matched") + count("locked")}</div><div className="s">awaiting batch</div></div>
        <div className="kpi"><div className="kicker">Settled</div><div className="v num bid">{count("settled")}</div><div className="s">final, irrevocable</div></div>
        <div className="kpi"><div className="kicker">Failed</div><div className="v num ask">{count("failed")}</div><div className="s">no assets moved</div></div>
        <div className="kpi"><div className="kicker">Value settled</div><div className="v num">{money(rows.filter((r) => r.status === "settled").reduce((a, r) => a + r.amountCents, 0))}</div><div className="s">last {rows.length} instructions</div></div>
      </div>
      <div className="grid-3 rise" style={{ animationDelay: "100ms", marginBottom: 10 }}>
        {Object.entries(MODES).map(([k, m]) => (
          <div key={k} className="panel panel-b">
            <div className="kicker">{k}</div>
            <div className="serif" style={{ fontSize: 22, margin: "4px 0" }}>{m.label}</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>{m.copy}</div>
          </div>
        ))}
      </div>
      <div className="panel rise" style={{ animationDelay: "140ms" }}>
        <div className="panel-h"><span className="t">Settlement instructions</span></div>
        {!s.data ? <div className="panel-b"><div className="skeleton" style={{ height: 80 }} /></div> : rows.length === 0 ?
          <div className="empty"><span className="serif">Nothing to clear</span>Trades executed on the terminal will appear here.</div> :
          <div className="scroll" style={{ maxHeight: "56vh" }}><table className="t">
            <thead><tr><th>#</th><th>Matched</th><th>Symbol</th><th>Buyer → Seller</th><th className="r">Qty</th><th className="r">Amount</th><th>Mode</th><th>Rail</th><th>Due</th><th>Status</th><th>Reference</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="num muted">{r.id}</td><td className="num muted">{time(r.createdAt)}</td><td className="mono">{r.symbol}</td>
                <td className="mono" style={{ fontSize: 11 }}>{r.buyerId} ← {r.sellerId}</td>
                <td className="r num">{r.qty}</td><td className="r num">{money(r.amountCents)}</td>
                <td><span className="tag">{MODES[r.mode]?.label ?? r.mode}</span></td><td className="mono">{r.rail}</td>
                <td className="num muted">{new Date(r.dueAt).toLocaleString("en-US", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td><span className={`tag ${r.status === "settled" ? "bid" : r.status === "failed" ? "ask" : "amber"}`}>{r.status}</span>
                  {r.failReason && <div className="ask" style={{ fontSize: 10.5, marginTop: 3 }}>{r.failReason}</div>}</td>
                <td className="mono muted" style={{ fontSize: 10.5, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={r.txRef ?? ""}>{r.txRef ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>
    </>
  );
}
