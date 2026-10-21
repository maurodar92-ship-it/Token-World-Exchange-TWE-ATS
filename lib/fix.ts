// Minimal FIX 4.4 tag=value codec with correct BodyLength (9) and CheckSum (10).

export const SOH = "\x01";
export type FixField = [number, string | number];

export interface FixHeader {
  msgType: string;
  sender: string;
  target: string;
  seqNum: number;
  sendingTime?: Date;
}

export function fixTimestamp(d: Date): string {
  const iso = d.toISOString(); // 2026-10-21T02:24:47.202Z
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}-${iso.slice(11, 23)}`;
}

export function encodeFix(header: FixHeader, body: FixField[], delimiter = SOH): string {
  const fields: FixField[] = [
    [35, header.msgType],
    [49, header.sender],
    [56, header.target],
    [34, header.seqNum],
    [52, fixTimestamp(header.sendingTime ?? new Date())],
    ...body,
  ];
  const bodyStr = fields.map(([t, v]) => `${t}=${v}${SOH}`).join("");
  const head = `8=FIX.4.4${SOH}9=${Buffer.byteLength(bodyStr)}${SOH}`;
  const sum = [...Buffer.from(head + bodyStr)].reduce((a, b) => a + b, 0) % 256;
  const msg = `${head}${bodyStr}10=${String(sum).padStart(3, "0")}${SOH}`;
  return delimiter === SOH ? msg : msg.split(SOH).join(delimiter);
}

export interface ParsedFix {
  fields: Map<number, string>;
  valid: boolean;
  errors: string[];
}

export function parseFix(raw: string): ParsedFix {
  const normalized = raw.trim().replace(/\|/g, SOH).replace(/\^A/g, SOH);
  const msg = normalized.endsWith(SOH) ? normalized : normalized + SOH;
  const parts = msg.split(SOH).filter(Boolean);
  const fields = new Map<number, string>();
  const errors: string[] = [];
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 1) { errors.push(`Malformed field "${p}"`); continue; }
    fields.set(Number(p.slice(0, eq)), p.slice(eq + 1));
  }
  if (fields.get(8) !== "FIX.4.4") errors.push("BeginString (8) must be FIX.4.4");

  const csIdx = msg.lastIndexOf(`${SOH}10=`);
  if (csIdx === -1) errors.push("Missing CheckSum (10)");
  else {
    const sum = [...Buffer.from(msg.slice(0, csIdx + 1))].reduce((a, b) => a + b, 0) % 256;
    if (Number(fields.get(10)) !== sum) errors.push(`CheckSum mismatch: expected ${String(sum).padStart(3, "0")}`);
    const bodyStart = msg.indexOf(SOH, msg.indexOf("9=")) + 1;
    const bodyLen = Buffer.byteLength(msg.slice(bodyStart, csIdx + 1));
    if (Number(fields.get(9)) !== bodyLen) errors.push(`BodyLength mismatch: expected ${bodyLen}`);
  }
  return { fields, valid: errors.length === 0, errors };
}

export const fixPx = (cents: number) => (cents / 100).toFixed(2);
export const FIX_SIDE: Record<string, string> = { buy: "1", sell: "2" };
export const FIX_ORD_TYPE: Record<string, string> = { market: "1", limit: "2" };
export const FIX_TIF: Record<string, string> = { day: "0", gtc: "1", ioc: "3" };
export const FIX_ORD_STATUS: Record<string, string> = {
  new: "0", partially_filled: "1", filled: "2", canceled: "4", rejected: "8",
};
