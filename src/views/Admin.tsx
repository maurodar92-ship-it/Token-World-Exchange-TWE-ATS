import { useState } from "react";
import { api, ApiError, money, time, type Instrument, type Participant } from "../api";
import { usePoll } from "../hooks";

interface Holder { participantId: string; name: string; kind: string; country: string; accredited: boolean; wallet: string | null; qty: number; restrictedQty: number; restrictedUntil: string | null; frozen: boolean; pct: number }
interface CapTable { instrument: Instrument; outstanding: number; unissued: number; holders: Holder[]; reconciled: boolean }
interface AdminAction { id: number; actor: string; action: string; target: string; reason: string; createdAt: string }

export function Admin({ instruments, refreshInstruments }: { instruments: Instrument[]; refreshInstruments: () => void }) {
  const [symbol, setSymbol] = useState(instruments.find((i) => i.assetClass !== "crypto")?.symbol ?? "AURA");
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const cap = usePoll<CapTable>(`/api/admin/captable/${encodeURIComponent(symbol)}`, 0, [symbol]);
  const people = usePoll<Participant[]>("/api/admin/participants", 0);
  const log = usePoll<AdminAction[]>("/api/admin/actions", 8000);
  const [mint, setMint] = useState({ participantId: "ACC-01", qty: "100", mode: "mint" });
  const [dist, setDist] = useState("25");

  const act = async (path: string, json: Record<string, unknown>, okText: string) => {
    try {
      await api(path, { method: "POST", json: { reason, ...json } });
      setToast({ ok: true, text: okText });
      cap.refresh(); people.refresh(); log.refresh(); refreshInstruments();
    } catch (e) {
      setToast({ ok: false, text: e instanceof ApiError ? e.message : String(e) });
    }
    setTimeout(() => setToast(null), 4000);
  };

  const inst = cap.data?.instrument ?? instruments.find((i) => i.symbol === symbol);
  const investors = (people.data ?? []).filter((p) => p.kind !== "venue");

  return (
    <>
      <div className="page-head rise">
        <div>
          <div className="kicker">Transfer agent & operations console</div>
          <h1 className="h-display">The book <em>of record</em></h1>
          <p>Cap tables, token supply, freezes and identity claims. Every action requires an audit reason and is journaled. Production deployments add dual-control (4-eyes) approval and SSO-backed operator roles.</p>
        </div>
        <label className="field" style={{ marginLeft: "auto", minWidth: 320 }}>
          <span>Audit reason (required for every action)</span>
          <input className="input" placeholder="e.g. Court order #2026-114, issuer instruction…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>

      <div className="grid-side">
        <div style={{ display: "grid", gap: 10 }}>
          <div className="panel rise">
            <div className="panel-h"><span className="t">Instrument</span></div>
            <div className="panel-b" style={{ display: "grid", gap: 10 }}>
              <select className="select" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                {instruments.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>)}
              </select>
              {inst && <div className="mono muted" style={{ fontSize: 11, lineHeight: 1.6 }}>
                {inst.tokenStandard} · {inst.issuancePlatform} · {inst.chain}<br />
                Status <b className={inst.status === "active" ? "bid" : "ask"}>{inst.status}</b> · lock-up {inst.lockupDays}d
              </div>}
              <div className="seg" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                {["active", "halted", "frozen"].map((s) => (
                  <button key={s} className={inst?.status === s ? "on" : ""} disabled={!reason}
                    onClick={() => act("/api/admin/instrument-status", { symbol, status: s }, `${symbol} → ${s}`)}>{s === "active" ? "Resume" : s === "halted" ? "Halt" : "Freeze"}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel rise" style={{ animationDelay: "60ms" }}>
            <div className="panel-h"><span className="t">Mint / burn</span></div>
            <div className="panel-b" style={{ display: "grid", gap: 10 }}>
              <div className="seg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <button className={mint.mode === "mint" ? "on buy" : ""} onClick={() => setMint({ ...mint, mode: "mint" })}>Mint</button>
                <button className={mint.mode === "burn" ? "on sell" : ""} onClick={() => setMint({ ...mint, mode: "burn" })}>Burn</button>
              </div>
              <select className="select" value={mint.participantId} onChange={(e) => setMint({ ...mint, participantId: e.target.value })}>
                {investors.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
              </select>
              <input className="input" value={mint.qty} onChange={(e) => setMint({ ...mint, qty: e.target.value.replace(/\D/g, "") })} />
              <button className="btn primary" disabled={!reason || !Number(mint.qty)}
                onClick={() => act(`/api/admin/${mint.mode}`, { symbol, participantId: mint.participantId, qty: Number(mint.qty) }, `${mint.mode} ${mint.qty} ${symbol}`)}>
                {mint.mode} {mint.qty} {symbol}
              </button>
              <div className="muted" style={{ fontSize: 11 }}>Mint requires approved KYC and a registered identity claim — the same check ERC-3643's identity registry enforces on-chain.</div>
            </div>
          </div>

          <div className="panel rise" style={{ animationDelay: "120ms" }}>
            <div className="panel-h"><span className="t">Corporate action</span></div>
            <div className="panel-b" style={{ display: "grid", gap: 10 }}>
              <label className="field"><span>{inst?.assetClass === "debt" ? "Coupon" : inst?.assetClass === "real_estate" ? "Rent" : "Dividend"} per token (¢)</span>
                <input className="input" value={dist} onChange={(e) => setDist(e.target.value.replace(/\D/g, ""))} /></label>
              <button className="btn" disabled={!reason || !Number(dist)}
                onClick={() => act("/api/admin/distribution", { symbol, amountPerUnitCents: Number(dist) }, `Distribution paid on ${symbol}`)}>Pay holders of record</button>
            </div>
          </div>

          <div className="panel rise" style={{ animationDelay: "180ms" }}>
            <div className="panel-h"><span className="t">Liquidity</span></div>
            <div className="panel-b" style={{ display: "grid", gap: 8 }}>
              <button className="btn" onClick={() => act("/api/admin/liquidity", { symbol }, `DMM quotes refreshed on ${symbol}`)}>Refresh DMM quotes · {symbol}</button>
              <button className="btn ghost" onClick={() => act("/api/admin/liquidity", {}, "DMM quotes refreshed on all books")}>Refresh all books</button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div className="panel rise" style={{ animationDelay: "80ms" }}>
            <div className="panel-h"><span className="t">Cap table · {symbol}</span>
              <span className="r">{cap.data && <>
                <span className="mono">{cap.data.outstanding.toLocaleString()} outstanding</span>
                <span className={`tag ${cap.data.reconciled ? "bid" : "ask"}`}>{cap.data.reconciled ? "reconciled" : "break"}</span></>}
              </span>
            </div>
            {!cap.data ? <div className="panel-b"><div className="skeleton" style={{ height: 100 }} /></div> :
              <div className="scroll" style={{ maxHeight: 340 }}><table className="t">
                <thead><tr><th>Holder</th><th>Type</th><th>Jurisdiction</th><th className="r">Tokens</th><th className="r">%</th><th>Restrictions</th><th /></tr></thead>
                <tbody>{cap.data.holders.map((h) => (
                  <tr key={h.participantId}>
                    <td><b className="mono">{h.participantId}</b><div className="muted" style={{ fontSize: 11 }}>{h.name}</div></td>
                    <td className="muted">{h.kind}{h.accredited ? " · AI" : ""}</td><td className="mono">{h.country}</td>
                    <td className="r num">{h.qty.toLocaleString()}</td><td className="r num">{(h.pct * 100).toFixed(2)}%</td>
                    <td>{h.frozen && <span className="tag ask">frozen</span>} {h.restrictedUntil && new Date(h.restrictedUntil) > new Date() && <span className="tag amber">{h.restrictedQty} locked</span>}</td>
                    <td className="r"><button className={`btn sm ${h.frozen ? "" : "danger"}`} disabled={!reason}
                      onClick={() => act("/api/admin/position-freeze", { symbol, participantId: h.participantId, frozen: !h.frozen }, `${h.participantId} ${h.frozen ? "unfrozen" : "frozen"}`)}>
                      {h.frozen ? "Unfreeze" : "Freeze"}</button></td>
                  </tr>
                ))}</tbody>
              </table></div>}
          </div>

          <div className="panel rise" style={{ animationDelay: "140ms" }}>
            <div className="panel-h"><span className="t">Identity registry · claims</span></div>
            <div className="scroll" style={{ maxHeight: 320 }}><table className="t">
              <thead><tr><th>Participant</th><th>Country</th><th>KYC</th><th>Accredited</th><th>Sanctions</th><th>Credential</th><th className="r">Cash</th></tr></thead>
              <tbody>{investors.map((p) => {
                const upd = (patch: Record<string, unknown>, label: string) => act(`/api/admin/participant/${p.id}`, patch, `${p.id}: ${label}`);
                return (
                  <tr key={p.id}>
                    <td><b className="mono">{p.id}</b><div className="muted" style={{ fontSize: 11 }}>{p.name}</div></td>
                    <td className="mono">{p.country}</td>
                    <td><button className={`btn sm ${p.kycStatus === "approved" ? "" : "danger"}`} disabled={!reason}
                      onClick={() => upd({ kycStatus: p.kycStatus === "approved" ? "pending" : "approved" }, "KYC toggled")}>{p.kycStatus}</button></td>
                    <td><button className="btn sm" disabled={!reason} onClick={() => upd({ accredited: !p.accredited }, "accreditation toggled")}>{p.accredited ? "yes" : "no"}</button></td>
                    <td><button className={`btn sm ${p.sanctionsClear ? "" : "danger"}`} disabled={!reason} onClick={() => upd({ sanctionsClear: !p.sanctionsClear }, "sanctions toggled")}>{p.sanctionsClear ? "clear" : "hit"}</button></td>
                    <td><button className="btn sm" disabled={!reason} onClick={() => upd({ credential: p.credentialId ? "revoke" : "issue" }, p.credentialId ? "credential revoked" : "credential issued")}>
                      {p.credentialId ? "revoke VC" : "issue VC"}</button></td>
                    <td className="r num">{money(p.cashCents)}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </div>

          <div className="panel rise" style={{ animationDelay: "200ms" }}>
            <div className="panel-h"><span className="t">Operator audit log</span></div>
            <div className="scroll" style={{ maxHeight: 240 }}>{!log.data?.length ? <div className="empty">No operator actions yet.</div> :
              <table className="t"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead>
                <tbody>{log.data.map((a) => (
                  <tr key={a.id}><td className="num muted">{time(a.createdAt)}</td><td className="mono">{a.actor}</td><td className="mono amber">{a.action}</td><td className="mono">{a.target}</td><td className="muted">{a.reason}</td></tr>
                ))}</tbody></table>}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className={`toast result ${toast.ok ? "good" : "bad"}`}>{toast.text}</div>}
    </>
  );
}
