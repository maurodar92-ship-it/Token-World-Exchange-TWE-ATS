import { money, REG_LABEL, usd, type Instrument, type Participant } from "../api";
import { usePoll } from "../hooks";
import { eligibility } from "../eligibility";

interface Position { participantId: string; instrumentId: number; symbol: string; name: string; qty: number; restrictedQty: number; restrictedUntil: string | null; frozen: boolean; refPriceCents: number; assetClass: string }
interface Tax {
  form: string;
  realized: { symbol: string; qty: number; acquired: string; sold: string; costCents: number; proceedsCents: number; gainCents: number; term: string }[];
  distributions: { symbol: string; at: string; kind: string; amountCents: number }[];
}

export function Portal({ acting, participant, instruments, onTrade }: {
  acting: string; participant?: Participant; instruments: Instrument[]; onTrade: (s: string) => void;
}) {
  const pf = usePoll<{ participant: Participant; positions: Position[] }>(`/api/admin/portfolio/${acting}`, 6000, [acting]);
  const tax = usePoll<Tax>(`/api/admin/tax/${acting}`, 0, [acting]);
  const p = pf.data?.participant ?? participant;
  const positions = (pf.data?.positions ?? []).filter((x) => x.qty > 0);
  const mv = positions.reduce((a, x) => a + x.qty * x.refPriceCents, 0);

  const vc = p && {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "TWEInvestorCredential"],
    issuer: "did:web:tokenworld.exchange",
    credentialSubject: {
      id: p.wallet ? `did:pkh:eip155:1:${p.wallet}` : `did:twe:${p.id}`,
      kycStatus: p.kycStatus, accreditedInvestor: p.accredited, countryOfResidence: p.country, sanctionsScreen: p.sanctionsClear ? "clear" : "hit",
    },
    credentialStatus: p.credentialId ? { type: "BitstringStatusListEntry", statusPurpose: "revocation", id: p.credentialId } : "none — not issued",
  };

  return (
    <>
      <div className="page-head rise">
        <div>
          <div className="kicker">Investor portal</div>
          <h1 className="h-display">Good to see you, <em>{p?.name.split(" (")[0] ?? "…"}</em></h1>
          <p>Your verified identity travels with your wallet as a W3C Verifiable Credential. Every listing below is checked against it before an order can reach the book.</p>
        </div>
      </div>
      <div className="kpis rise" style={{ animationDelay: "60ms" }}>
        <div className="kpi"><div className="kicker">Cash (USD / USDC)</div><div className="v num">{p ? money(p.cashCents) : "—"}</div><div className="s">Settles DvP against token delivery</div></div>
        <div className="kpi"><div className="kicker">Token holdings</div><div className="v num">{money(mv)}</div><div className="s">{positions.length} positions marked at reference</div></div>
        <div className="kpi"><div className="kicker">Investor status</div><div className="v">{p?.accredited ? "Accredited" : "Non-accredited"}</div><div className="s">{p?.country} · KYC {p?.kycStatus}</div></div>
        <div className="kpi"><div className="kicker">Tax form</div><div className="v">{tax.data?.form ?? "—"}</div><div className="s">FIFO lots · {tax.data?.realized.length ?? 0} realized</div></div>
      </div>

      <div className="grid-side">
        <div className="panel idcard rise" style={{ animationDelay: "100ms" }}>
          <div className="kicker">Identity gateway · ERC-734/735 claims</div>
          {p && (
            <dl className="kv">
              <dt>Participant</dt><dd>{p.id}</dd>
              <dt>Wallet</dt><dd>{p.wallet ?? <span className="muted">custodial (no self-custody wallet)</span>}</dd>
              <dt>KYC / AML</dt><dd><span className={`tag ${p.kycStatus === "approved" ? "bid" : "ask"}`}>{p.kycStatus}</span></dd>
              <dt>Sanctions</dt><dd><span className={`tag ${p.sanctionsClear ? "bid" : "ask"}`}>{p.sanctionsClear ? "clear" : "OFAC hit"}</span></dd>
              <dt>Accreditation</dt><dd><span className={`tag ${p.accredited ? "bid" : ""}`}>{p.accredited ? "verified 506(c)" : "not accredited"}</span></dd>
              <dt>Credential</dt><dd>{p.credentialId ?? <span className="ask">none — permissioned pairs blocked</span>}</dd>
            </dl>
          )}
          <pre className="code">{JSON.stringify(vc, null, 2)}</pre>
          <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>Fiat on-ramp (Plaid / ACH) and wallet connectors (Turnkey, Privy, MetaMask Institutional) are specified in the front-end blueprint; the sandbox pre-funds accounts.</div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div className="panel rise" style={{ animationDelay: "140ms" }}>
            <div className="panel-h"><span className="t">Positions</span></div>
            {!pf.data ? <div className="panel-b"><div className="skeleton" style={{ height: 60 }} /></div> : positions.length === 0 ?
              <div className="empty"><span className="serif">No tokens yet</span>Pick an eligible listing below to place your first order.</div> :
              <table className="t">
                <thead><tr><th>Asset</th><th className="r">Qty</th><th className="r">Mark</th><th className="r">Value</th><th>Restrictions</th></tr></thead>
                <tbody>{positions.map((x) => {
                  const locked = x.restrictedUntil && new Date(x.restrictedUntil) > new Date() ? x.restrictedQty : 0;
                  return (
                    <tr key={x.instrumentId}>
                      <td><b className="mono">{x.symbol}</b><div className="muted" style={{ fontSize: 11 }}>{x.name}</div></td>
                      <td className="r num">{x.qty.toLocaleString()}</td>
                      <td className="r num">{usd(x.refPriceCents)}</td>
                      <td className="r num">{money(x.qty * x.refPriceCents)}</td>
                      <td>
                        {x.frozen && <span className="tag ask">frozen by TA</span>}{" "}
                        {locked > 0 ? <span className="tag amber">{locked.toLocaleString()} locked to {x.restrictedUntil!.slice(0, 10)}</span> : !x.frozen && <span className="muted">free to trade</span>}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>}
          </div>

          <div className="panel rise" style={{ animationDelay: "180ms" }}>
            <div className="panel-h"><span className="t">Statements & tax lots</span><span className="r">{tax.data?.form}</span></div>
            {!tax.data ? <div className="panel-b"><div className="skeleton" style={{ height: 40 }} /></div> :
              tax.data.realized.length + tax.data.distributions.length === 0 ? <div className="empty">No taxable events in the reporting window.</div> :
              <div className="scroll" style={{ maxHeight: 240 }}><table className="t">
                <thead><tr><th>Event</th><th>Asset</th><th className="r">Qty</th><th className="r">Proceeds</th><th className="r">Basis</th><th className="r">Gain</th></tr></thead>
                <tbody>
                  {tax.data.realized.map((r, i) => (
                    <tr key={`r${i}`}><td className="muted">Sale · {r.term}-term</td><td className="mono">{r.symbol}</td><td className="r num">{r.qty}</td>
                      <td className="r num">{money(r.proceedsCents)}</td><td className="r num">{new Date(r.acquired).getTime() === 0 ? <span className="muted">unknown</span> : money(r.costCents)}</td>
                      <td className={`r num ${r.gainCents >= 0 ? "bid" : "ask"}`}>{money(r.gainCents)}</td></tr>
                  ))}
                  {tax.data.distributions.map((d, i) => (
                    <tr key={`d${i}`}><td className="muted">{d.kind}</td><td className="mono">{d.symbol}</td><td /><td className="r num">{money(d.amountCents)}</td><td /><td /></tr>
                  ))}
                </tbody>
              </table></div>}
          </div>
        </div>
      </div>

      <h2 className="serif rise" style={{ fontSize: 30, margin: "26px 0 12px" }}>Tokenized asset marketplace</h2>
      <div className="cards">
        {instruments.filter((i) => i.assetClass !== "crypto").map((i, k) => {
          const blocks = eligibility(p, i);
          return (
            <div key={i.symbol} className="card rise" style={{ animationDelay: `${200 + k * 40}ms` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span className="tag amber">{i.issuancePlatform}</span><span className="tag info">{REG_LABEL[i.regExemption]}</span>
              </div>
              <h3>{i.name}</h3>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{i.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="num" style={{ fontSize: 20 }}>{money(i.refPriceCents)}</span>
                <span className="mono muted" style={{ fontSize: 10.5 }}>{i.tokenStandard} · {i.chain}</span>
              </div>
              {blocks.length ? <div className="tag ask" style={{ whiteSpace: "normal" }}>Not eligible: {blocks.join(" · ")}</div> :
                <button className="btn primary" onClick={() => onTrade(i.symbol)}>Trade {i.symbol}</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}
