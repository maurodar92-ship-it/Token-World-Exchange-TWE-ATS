import { FIX_TAG_NAMES } from "../fix-client";

export function FixLine({ msg }: { msg: string }) {
  const parts = msg.split("|").filter(Boolean);
  const type = parts.find((p) => p.startsWith("35="))?.slice(3);
  const label = type === "D" ? "NewOrderSingle" : type === "8" ? "ExecutionReport" : type === "3" ? "Reject" : `MsgType ${type}`;
  return (
    <div className="msg">
      <div className="muted" style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 2 }}>
        35={type} · {label}
      </div>
      {parts.map((p, i) => {
        const [k, ...v] = p.split("=");
        return (
          <span key={i} title={FIX_TAG_NAMES[k] ?? `Tag ${k}`}>
            <span className="tagk">{k}</span>=<span className="tagv">{v.join("=")}</span><span className="sep">|</span>
          </span>
        );
      })}
    </div>
  );
}
