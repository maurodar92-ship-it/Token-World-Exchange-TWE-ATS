// Browser-side FIX 4.4 helpers for composing sample NewOrderSingle messages.
const SOH = "\x01";

function ts(d: Date) {
  const i = d.toISOString();
  return `${i.slice(0, 4)}${i.slice(5, 7)}${i.slice(8, 10)}-${i.slice(11, 23)}`;
}

export function buildNewOrderSingle(o: {
  sender: string; seq: number; clOrdId: string; symbol: string; side: "buy" | "sell"; qty: number; price?: string; type: "limit" | "market"; sor?: boolean;
}) {
  const now = new Date();
  const fields: [number, string | number][] = [
    [35, "D"], [49, o.sender], [56, "TWEATS"], [34, o.seq], [52, ts(now)],
    [11, o.clOrdId], [55, o.symbol], [54, o.side === "buy" ? "1" : "2"], [60, ts(now)], [38, o.qty],
    [40, o.type === "market" ? "1" : "2"], ...(o.type === "limit" && o.price ? [[44, o.price] as [number, string]] : []),
    [59, o.type === "market" ? "3" : "1"], ...(o.sor ? [[100, "SOR"] as [number, string]] : []),
  ];
  const enc = new TextEncoder();
  const body = fields.map(([t, v]) => `${t}=${v}${SOH}`).join("");
  const head = `8=FIX.4.4${SOH}9=${enc.encode(body).length}${SOH}`;
  const sum = enc.encode(head + body).reduce((a, b) => a + b, 0) % 256;
  return `${head}${body}10=${String(sum).padStart(3, "0")}${SOH}`.split(SOH).join("|");
}

export const FIX_TAG_NAMES: Record<string, string> = {
  "8": "BeginString", "9": "BodyLength", "35": "MsgType", "49": "SenderCompID", "56": "TargetCompID", "34": "MsgSeqNum",
  "52": "SendingTime", "11": "ClOrdID", "55": "Symbol", "54": "Side", "60": "TransactTime", "38": "OrderQty", "40": "OrdType",
  "44": "Price", "59": "TimeInForce", "37": "OrderID", "17": "ExecID", "150": "ExecType", "39": "OrdStatus", "32": "LastQty",
  "31": "LastPx", "30": "LastMkt", "151": "LeavesQty", "14": "CumQty", "6": "AvgPx", "58": "Text", "10": "CheckSum",
  "100": "ExDestination", "45": "RefSeqNum", "371": "RefTagID", "372": "RefMsgType",
};
