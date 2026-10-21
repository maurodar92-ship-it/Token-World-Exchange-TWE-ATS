import type { Instrument, Participant } from "./api";

/** Client-side preview of the server's pre-trade gate, used to badge marketplace listings. */
export function eligibility(p: Participant | undefined, i: Instrument): string[] {
  if (!p) return [];
  const r: string[] = [];
  if (p.kycStatus !== "approved") r.push("KYC pending");
  if (!p.sanctionsClear) r.push("Sanctions hold");
  if (i.permissioned && !p.credentialId) r.push("No verifiable credential");
  if (i.regExemption === "reg_d_506c" && !p.accredited) r.push("Accredited investors only");
  if (i.regExemption === "reg_s" && p.country === "US") r.push("Non-US persons only");
  if (i.status !== "active") r.push(`Trading ${i.status}`);
  return r;
}
