export interface Instrument {
  id: number; symbol: string; name: string; assetClass: string; tokenStandard: string; issuancePlatform: string;
  chain: string; regExemption: string; permissioned: boolean; status: string; refPriceCents: number; tickCents: number;
  lockupDays: number; totalSupply: number; description: string; volume24h: number; open24hCents: number; trades24h: number;
}
export interface Participant {
  id: string; name: string; kind: string; country: string; accredited: boolean; kycStatus: string; sanctionsClear: boolean;
  wallet: string | null; credentialId: string | null; cashCents: number;
}
export interface Level { priceCents: number; qty: number; orders: number }
export interface Book { symbol: string; status: string; refPriceCents: number; tickCents: number; bids: Level[]; asks: Level[] }
export interface Order {
  id: number; clOrdId: string; symbol: string; side: string; type: string; tif: string; priceCents: number | null; qty: number;
  leavesQty: number; cumQty: number; filledNotionalCents: number; status: string; rejectReason: string | null; routing: string;
  source: string; createdAt: string;
}
export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
export interface Tape { id: number; priceCents: number; qty: number; aggressorSide: string; venue: string; createdAt: string }

let acting = localStorage.getItem("twe.participant") ?? "INST-01";
export const getActing = () => acting;
export const setActing = (id: string) => { acting = id; localStorage.setItem("twe.participant", id); };

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: unknown) { super(message); }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      "x-twe-participant": acting,
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok && res.status !== 422) throw new ApiError(data?.error ?? res.statusText, res.status, data);
  return data as T;
}

export const usd = (cents: number, digits = 2) =>
  (cents / 100).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const money = (cents: number) => `$${usd(cents)}`;
export const compact = (n: number) => n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
export const time = (s: string | Date) => new Date(s).toLocaleTimeString("en-US", { hour12: false });

export const REG_LABEL: Record<string, string> = {
  reg_d_506c: "Reg D 506(c)", reg_s: "Reg S", reg_a_tier2: "Reg A+ T2", reg_cf: "Reg CF", none: "Unrestricted",
};
