import { useEffect, useState } from "react";
import { getActing, setActing, type Instrument, type Participant } from "./api";
import { usePoll } from "./hooks";
import { Terminal } from "./views/Terminal";
import { Portal } from "./views/Portal";
import { Compliance } from "./views/Compliance";
import { Settlement } from "./views/Settlement";
import { Admin } from "./views/Admin";
import { Specs } from "./views/Specs";

const VIEWS = [
  { id: "terminal", label: "Terminal", k: "A" },
  { id: "portal", label: "Investor", k: "D" },
  { id: "settlement", label: "Settlement", k: "C" },
  { id: "compliance", label: "Surveillance", k: "A" },
  { id: "admin", label: "Transfer agent", k: "B" },
  { id: "specs", label: "Specs", k: "§" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const fromHash = (): View => {
  const h = location.hash.slice(1);
  return (VIEWS.find((v) => v.id === h)?.id ?? "terminal") as View;
};

export function App() {
  const [view, setView] = useState<View>(fromHash);
  const [acting, setActingState] = useState(getActing());
  const [symbol, setSymbol] = useState(localStorage.getItem("twe.symbol") ?? "AURA");
  const instruments = usePoll<Instrument[]>("/api/instruments", 6000);
  const participants = usePoll<Participant[]>("/api/admin/participants", 15000);

  useEffect(() => {
    const on = () => setView(fromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  useEffect(() => { localStorage.setItem("twe.symbol", symbol); }, [symbol]);

  const go = (v: View) => { location.hash = v; setView(v); };
  const changeActing = (id: string) => { setActing(id); setActingState(id); };
  const me = participants.data?.find((p) => p.id === acting);
  const list = instruments.data ?? [];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><span className="mark">TWE</span><span className="full">Token World Exchange · ATS</span></div>
        <nav className="nav">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id ? "on" : ""} onClick={() => go(v.id)}><span className="k">{v.k}</span>{v.label}</button>
          ))}
        </nav>
        <div className="spacer" />
        <label className="acting">
          ACTING AS
          <select value={acting} onChange={(e) => changeActing(e.target.value)}>
            {(participants.data ?? [{ id: acting, name: acting, kind: "" } as Participant])
              .filter((p) => p.kind !== "venue")
              .map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
          </select>
        </label>
        <span className="sandbox" title="Simulated venues, pre-funded accounts, no real assets">Sandbox</span>
      </header>

      <main className="main" key={view}>
        {instruments.error && !list.length && <div className="result bad" style={{ marginBottom: 10 }}>Market data unavailable: {instruments.error}</div>}
        {!list.length && !instruments.error && view !== "specs" ? (
          <div className="empty" style={{ paddingTop: 120 }}><span className="serif" style={{ fontSize: 34 }}>Opening the books…</span>Seeding the sandbox exchange on first load.</div>
        ) : (
          <>
            {view === "terminal" && <Terminal instruments={list} symbol={list.some((i) => i.symbol === symbol) ? symbol : list[0]?.symbol} setSymbol={setSymbol} acting={acting} />}
            {view === "portal" && <Portal acting={acting} participant={me} instruments={list} onTrade={(s) => { setSymbol(s); go("terminal"); }} />}
            {view === "settlement" && <Settlement />}
            {view === "compliance" && <Compliance />}
            {view === "admin" && <Admin instruments={list} refreshInstruments={instruments.refresh} />}
            {view === "specs" && <Specs />}
          </>
        )}
      </main>

      <footer className="footer">
        <span><b>Matching</b> price-time FIFO · STP cancel-newest</span>
        <span><b>Gateway</b> FIX 4.4 · REST</span>
        <span><b>Venues</b> 7 simulated adapters</span>
        <span><b>Settlement</b> DvP atomic / T+0 / T+1</span>
        <span style={{ marginLeft: "auto" }}>Sandbox prototype — not an offer to buy or sell securities.</span>
      </footer>
    </div>
  );
}
