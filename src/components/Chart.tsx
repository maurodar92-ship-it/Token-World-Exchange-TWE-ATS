import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "../api";
import { usd } from "../api";

/** Lightweight SVG candlestick + volume chart (a production terminal embeds the TradingView Charting Library). */
export function Chart({ candles, refPriceCents }: { candles: Candle[]; refPriceCents: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<number | null>(null);
  const h = 300;
  const pad = { l: 8, r: 62, t: 14, b: 22 };

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    if (!candles.length) return null;
    const hi = Math.max(...candles.map((c) => c.h), refPriceCents);
    const lo = Math.min(...candles.map((c) => c.l), refPriceCents);
    const span = Math.max(hi - lo, hi * 0.004);
    const top = hi + span * 0.08, bot = lo - span * 0.08;
    const plotH = h - pad.t - pad.b - 46;
    const y = (p: number) => pad.t + ((top - p) / (top - bot)) * plotH;
    const step = (w - pad.l - pad.r) / candles.length;
    const vmax = Math.max(...candles.map((c) => c.v), 1);
    const ticks = Array.from({ length: 5 }, (_, i) => bot + ((top - bot) * (i + 0.5)) / 5);
    return { y, step, vmax, ticks, plotH };
  }, [candles, w, refPriceCents]);

  if (!g) return <div ref={ref} className="chart-wrap empty"><span className="serif">No prints yet</span>Trades will draw here.</div>;
  const cw = Math.max(2, Math.min(12, g.step * 0.62));
  const hc = hover !== null ? candles[hover] : candles[candles.length - 1];

  return (
    <div ref={ref} className="chart-wrap" onMouseLeave={() => setHover(null)}>
      <div className="mono" style={{ position: "absolute", left: 12, top: 8, fontSize: 10.5, color: "var(--ink-3)", display: "flex", gap: 12 }}>
        <span>O <b className="dim">{usd(hc.o)}</b></span><span>H <b className="dim">{usd(hc.h)}</b></span>
        <span>L <b className="dim">{usd(hc.l)}</b></span><span>C <b className={hc.c >= hc.o ? "bid" : "ask"}>{usd(hc.c)}</b></span>
        <span>V <b className="dim">{hc.v.toLocaleString()}</b></span>
        <span>{new Date(hc.t).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <svg width={w} height={h} onMouseMove={(e) => {
        const x = e.clientX - (e.currentTarget.getBoundingClientRect().left) - pad.l;
        setHover(Math.max(0, Math.min(candles.length - 1, Math.floor(x / g.step))));
      }}>
        {g.ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={g.y(t)} y2={g.y(t)} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={w - pad.r + 8} y={g.y(t) + 3} fill="var(--ink-3)" fontSize="10" fontFamily="var(--mono)">{usd(t)}</text>
          </g>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={g.y(refPriceCents)} y2={g.y(refPriceCents)} stroke="var(--amber)" strokeOpacity=".5" />
        <rect x={w - pad.r + 2} y={g.y(refPriceCents) - 8} width={pad.r - 4} height={16} fill="var(--amber)" rx="2" />
        <text x={w - pad.r + 7} y={g.y(refPriceCents) + 3.5} fill="#120d00" fontSize="10" fontWeight="700" fontFamily="var(--mono)">{usd(refPriceCents)}</text>
        {candles.map((c, i) => {
          const x = pad.l + i * g.step + g.step / 2;
          const up = c.c >= c.o;
          const col = up ? "var(--bid)" : "var(--ask)";
          const vh = (c.v / g.vmax) * 40;
          return (
            <g key={c.t} opacity={hover === null || hover === i ? 1 : 0.55}>
              <rect x={x - cw / 2} y={h - pad.b - vh} width={cw} height={vh} fill={col} opacity=".22" />
              <line x1={x} x2={x} y1={g.y(c.h)} y2={g.y(c.l)} stroke={col} />
              <rect x={x - cw / 2} y={g.y(Math.max(c.o, c.c))} width={cw} height={Math.max(1, Math.abs(g.y(c.o) - g.y(c.c)))} fill={up ? "var(--bg)" : col} stroke={col} />
            </g>
          );
        })}
        {hover !== null && <line x1={pad.l + hover * g.step + g.step / 2} x2={pad.l + hover * g.step + g.step / 2} y1={pad.t} y2={h - pad.b} stroke="var(--ink-3)" strokeDasharray="3 3" />}
      </svg>
    </div>
  );
}
